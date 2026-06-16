// Mock Supabase client for testing.

const mockData: Record<string, Record<string, any[]>> = {};

export const mockSupabase = {
  from: jest.fn((table: string) => {
    if (!mockData[table]) mockData[table] = {};

    const chain: any = {
      _table: table,
      _filters: {} as Record<string, any>,
      _data: null as any,
      _operation: null as string,

      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockImplementation((data: any) => {
        chain._data = data;
        chain._operation = 'insert';
        return chain;
      }),
      update: jest.fn().mockImplementation((data: any) => {
        chain._data = data;
        chain._operation = 'update';
        return chain;
      }),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => {
        if (chain._operation === 'insert') {
          return Promise.resolve({ data: { ...chain._data, id: chain._data?.id || 'test-id' }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    };

    return chain;
  }),
  rpc: jest.fn().mockResolvedValue({ data: 0, error: null }),
};

export function setMockReturn(table: string, operation: string, data: any) {
  if (!mockData[table]) mockData[table] = {};
  mockData[table][operation] = data;
}

export function resetMocks() {
  Object.keys(mockData).forEach((key) => delete mockData[key]);
  mockSupabase.from.mockClear();
  mockSupabase.rpc.mockClear();
}
