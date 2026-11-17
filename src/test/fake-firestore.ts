// 테스트용 최소 Firestore 대역. collection(name).doc(id)의 get/create/set만 흉내 낸다.

type Data = Record<string, unknown>;

export class FakeFirestore {
  /** "collection/docId" → data */
  readonly docs = new Map<string, Data>();
  readonly reads: string[] = [];
  readonly creates: string[] = [];

  collection(name: string) {
    return {
      doc: (id: string) => this.doc(`${name}/${id}`, id),
    };
  }

  private doc(path: string, id: string) {
    return {
      id,
      path,
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
    };
  }

  /** 트랜잭션 흉내: 읽기는 바로, 쓰기는 함수가 끝난 뒤 한꺼번에 반영한다. */
  async runTransaction<T>(
    fn: (tx: {
      get: (ref: { get: () => Promise<unknown> }) => Promise<unknown>;
      set: (ref: { set: (data: Data) => Promise<void> }, data: Data) => void;
    }) => Promise<T>,
  ): Promise<T> {
    const writes: Array<() => Promise<void>> = [];
    const result = await fn({
      get: (ref) => ref.get(),
      set: (ref, data) => {
        writes.push(() => ref.set(data));
      },
    });
    for (const write of writes) await write();
    return result;
  }

  reset() {
    this.docs.clear();
    this.reads.length = 0;
    this.creates.length = 0;
  }
}
