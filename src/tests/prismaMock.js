import { vi } from "vitest";

export const prismaMock = {
  post: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateMany: vi.fn()
  },
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  category: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  tag: {
    findMany: vi.fn(),
    upsert: vi.fn()
  },
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn()
  }
};

export function resetPrismaMock() {
  Object.values(prismaMock).forEach((model) => {
    Object.values(model).forEach((mockFn) => mockFn.mockReset());
  });
}
