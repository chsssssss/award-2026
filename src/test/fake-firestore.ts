// 테스트용 최소 Firestore 대역.
// collection(name).doc(id)(하위 컬렉션 포함)의 get/create/set/update와 runTransaction을 흉내 낸다.
// update는 FieldValue.increment(n)를 실제로 더한다.

type Data = Record<string, unknown>;

function isIncrement(value: unknown): value is { operand: number } {
  return (
    !!value &&
    typeof value === "object" &&
    value.constructor?.name === "NumericIncrementTransform" &&
    typeof (value as { operand?: unknown }).operand === "number"
  );
}

export type FakeDocRef = ReturnType<FakeFirestore["docRef"]>;

export class FakeFirestore {
  /** "collection/docId[/sub/docId]" → data */
  readonly docs = new Map<string, Data>();
  readonly reads: string[] = [];
  readonly creates: string[] = [];
  readonly updates: string[] = [];

  collection(path: string) {
    return {
      doc: (id: string) => this.docRef(`${path}/${id}`, id),
    };
  }

  docRef(path: string, id: string) {
    return {
      id,
      path,
      collection: (name: string) => this.collection(`${path}/${name}`),
      get: async () => {
        this.reads.push(path);
        const data = this.docs.get(path);
        return {
          id,
          exists: data !== undefined,
          data: () => (data === undefined ? undefined : { ...data }),
        };
      },
      create: async (data: Data) => {
        this.creates.push(path);
        if (this.docs.has(path)) {
          throw Object.assign(new Error("6 ALREADY_EXISTS: Document already exists"), {
            code: 6,
          });
        }
        this.docs.set(path, { ...data });
      },
      set: async (data: Data) => {
        this.docs.set(path, { ...data });
      },
      update: async (data: Data) => {
        this.updates.push(path);
        const current = this.docs.get(path);
        if (!current) {
          throw Object.assign(new Error("5 NOT_FOUND: No document to update"), {
            code: 5,
          });
        }
        const next = { ...current };
        for (const [key, value] of Object.entries(data)) {
          next[key] = isIncrement(value)
            ? (typeof next[key] === "number" ? (next[key] as number) : 0) + value.operand
            : value;
        }
        this.docs.set(path, next);
      },
    };
  }

  /** 트랜잭션 흉내: 읽기는 바로, 쓰기는 함수가 끝난 뒤 한꺼번에 반영한다. */
  async runTransaction<T>(
    fn: (tx: {
      get: (ref: FakeDocRef) => ReturnType<FakeDocRef["get"]>;
      set: (ref: FakeDocRef, data: Data) => void;
      create: (ref: FakeDocRef, data: Data) => void;
      update: (ref: FakeDocRef, data: Data) => void;
    }) => Promise<T>,
  ): Promise<T> {
    const writes: Array<() => Promise<void>> = [];
    const result = await fn({
      get: (ref) => ref.get(),
      set: (ref, data) => void writes.push(() => ref.set(data)),
      create: (ref, data) => void writes.push(() => ref.create(data)),
      update: (ref, data) => void writes.push(() => ref.update(data)),
    });
    for (const write of writes) await write();
    return result;
  }

  reset() {
    this.docs.clear();
    this.reads.length = 0;
    this.creates.length = 0;
    this.updates.length = 0;
  }
}
