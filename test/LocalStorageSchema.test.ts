import { LocalStorageSchema } from '../src/LocalStorageSchema';
import * as Yup from 'yup';

interface TestObject {
  hello: 'world' | 'state';
}

beforeEach(() => {
  localStorage.clear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

test('LocalStorageSchema can set and get an item', () => {
  const accessor = new LocalStorageSchema().accessor({ key: 'test' });
  accessor.set('hello world');
  expect(accessor.get()).toBe('hello world');
});

test('LocalStorageSchema can get items with a default value', () => {
  const accessor = new LocalStorageSchema().accessor({
    key: 'notSet',
    defaultValue: 'hello world',
  });
  expect(localStorage.getItem('notSet')).toBe(null);
  expect(accessor.get()).toBe('hello world');
});

test('LocalStorageSchema can validate items on get, removing invalid values', () => {
  localStorage.setItem('test', 'hello country');
  const accessor = new LocalStorageSchema().accessor({
    key: 'test',
    yupSchema: Yup.string().matches(/world/i),
  });
  expect(accessor.get()).toBe(undefined);
  expect(localStorage.getItem('test')).toBe(null);
});

test('LocalStorageSchema returns default value when validation fails', () => {
  localStorage.setItem('test', 'hello country');
  const accessor = new LocalStorageSchema().accessor({
    key: 'test',
    yupSchema: Yup.string().matches(/world/i),
    defaultValue: 'hello world',
  });
  expect(accessor.get()).toBe('hello world');
  expect(localStorage.getItem('test')).toBe('hello world');
});

test('LocalStorageSchema can accept a unmarshal and marshal function', () => {
  const accessor = new LocalStorageSchema().accessor({
    key: 'test',
    marshal: (value: string) => `${value} world`,
    unmarshal: (localValue: string) => localValue.substr(0, 5),
  });
  accessor.set('hello');

  expect(localStorage.getItem('test')).toBe('hello world');
  expect(accessor.get()).toBe('hello');
});

test('LocalStorageSchema can marshal default values', () => {
  const accessor = new LocalStorageSchema().accessor<TestObject>({
    key: 'unset',
    marshal: JSON.stringify,
    unmarshal: JSON.parse,
    defaultValue: { hello: 'world' },
  });
  expect(accessor.get()).toMatchObject({ hello: 'world' });

  expect(localStorage.getItem('unset')).toBe(
    JSON.stringify({ hello: 'world' })
  );
});

test('LocalStorageSchema throws an error when default value doesnt pass validation', () => {
  const accessor = new LocalStorageSchema().accessor({
    key: 'test',
    defaultValue: 'hello country',
    yupSchema: Yup.string().matches(/world/i),
  });
  expect(() => accessor.get()).toThrow(Error);
});

test('LocalStorageSchema does nothing when setting an invalid value', () => {
  const accessor = new LocalStorageSchema().accessor({
    key: 'test',
    yupSchema: Yup.string().matches(/world/i),
  });
  accessor.set('hello country');
  expect(console.error).toHaveBeenCalled();
  expect(accessor.get()).toBe(undefined);
});

test('LocalStorageSchema string can set and get strings', () => {
  const testString = new LocalStorageSchema().string({
    key: 'test',
    defaultValue: 'hello world',
    yupSchema: Yup.string().matches(/world/i),
  });
  testString.set('hello state');
  expect(localStorage.getItem('test')).toBe(null);
  expect(testString.get()).toBe('hello world');
  testString.set('sup world');
  expect(testString.get()).toBe('sup world');
});

test('LocalStorageSchema boolean can set and get booleans', () => {
  const testBoolean = new LocalStorageSchema().boolean({
    key: 'test',
    defaultValue: true,
    yupSchema: Yup.boolean().oneOf([true]),
  });
  testBoolean.set(false);
  expect(localStorage.getItem('test')).toBe(null);
  expect(testBoolean.get()).toBe(true);

  localStorage.removeItem('test');
  testBoolean.set(true);
  expect(testBoolean.get()).toBe(true);
});

test('LocalStorageSchema number can set and get numbers', () => {
  const testNumber = new LocalStorageSchema().number({
    key: 'test',
    defaultValue: 42,
    yupSchema: Yup.number().oneOf([7, 42]),
  });
  testNumber.set(1);
  expect(localStorage.getItem('test')).toBe(null);
  expect(testNumber.get()).toBe(42);
  testNumber.set(7);
  expect(testNumber.get()).toBe(7);
});

test('LocalStorageSchema object can set and get objects', () => {
  const testObject = new LocalStorageSchema().object<TestObject>({
    key: 'test',
    defaultValue: { hello: 'world' },
    yupSchema: Yup.object().shape({
      hello: Yup.mixed().oneOf(['world', 'state']),
    }),
  });
  // @ts-ignore
  testObject.set({ hello: 'thing' });
  expect(localStorage.getItem('test')).toBe(null);
  expect(testObject.get()).toMatchObject({ hello: 'world' });
  testObject.set({ hello: 'state' });
  expect(testObject.get()).toMatchObject({ hello: 'state' });
});

test('LocalStorageSchema array can set and get arrays', () => {
  const testArray = new LocalStorageSchema().array<TestObject[]>({
    key: 'test',
    defaultValue: [{ hello: 'world' }],
    yupSchema: Yup.array().of(
      Yup.object().shape({
        hello: Yup.mixed().oneOf(['world', 'state']),
      })
    ),
  });
  // @ts-ignore
  testArray.set([{ hello: 'thing' }]);
  expect(localStorage.getItem('test')).toBe(null);
  expect(testArray.get()).toEqual([{ hello: 'world' }]);
  testArray.set([{ hello: 'state' }]);
  expect(testArray.get()).toEqual([{ hello: 'state' }]);
});

test('LocalStorageSchema Map can set and get Maps', () => {
  const defaultMap = new Map<string, TestObject>();
  defaultMap.set('world', { hello: 'world' });

  const testMap = new LocalStorageSchema().map<string, TestObject>({
    key: 'test',
    defaultValue: defaultMap,
    validate: value => value instanceof Map,
  });

  // @ts-ignore
  testMap.set('thing');
  expect(localStorage.getItem('test')).toBe(null);
  expect(testMap.get()).toEqual(defaultMap);

  const newMap = new Map<string, TestObject>([['world', { hello: 'state' }]]);
  testMap.set(newMap);
  expect(testMap.get()).toEqual(newMap);
});

test('LocalStorageSchema can take a prefix for all keys', () => {
  const accessor = new LocalStorageSchema({ prefix: 'blue-' }).accessor({
    key: 'test',
  });

  accessor.set('hello world');
  expect(localStorage.getItem('test')).toBe(null);
  expect(localStorage.getItem('blue-test')).toBe('hello world');
  expect(accessor.get()).toBe('hello world');
});

test('LocalStorageSchema throws when registering duplicate keys', () => {
  const schema = new LocalStorageSchema();
  schema.object({ key: 'test' });
  expect(() => schema.string({ key: 'test' })).toThrow();
});

test('LocalStorageSchema can define an accessor multiple times if registerKey is false', () => {
  const schema = new LocalStorageSchema();
  schema.object({ key: 'test', skipRegistration: true });
  expect(() =>
    schema.object({ key: 'test', skipRegistration: true })
  ).not.toThrow();
});

test('LocalStorageSchema removes key registration on accessor.remove', () => {
  const schema = new LocalStorageSchema();
  const accessor = schema.object({ key: 'test' });
  accessor.remove();
  expect(() => schema.object({ key: 'test' })).not.toThrow();
});
