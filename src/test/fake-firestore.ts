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

  reset() {
    this.docs.clear();
    this.reads.length = 0;
    this.creates.length = 0;
  }
}
