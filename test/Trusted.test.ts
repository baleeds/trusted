import { Trusted } from '../src/Trusted';
import * as Yup from 'yup';

interface TestObject {
  hello: 'world' | 'state';
}

beforeEach(() => {
  localStorage.clear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

test('Trusted can set and get an item', () => {
  const accessor = new Trusted().accessor({ key: 'test' });
  accessor.set('hello world');
  expect(accessor.get()).toBe('hello world');
});

test('Trusted can get items with a default value', () => {
  const accessor = new Trusted().accessor({
    key: 'notSet',
    defaultValue: 'hello world',
  });
  expect(localStorage.getItem('notSet')).toBe(null);
  expect(accessor.get()).toBe('hello world');
});

test('Trusted can validate items on get, removing invalid values', () => {
  localStorage.setItem('test', 'hello country');
  const accessor = new Trusted().accessor({
    key: 'test',
    yupSchema: Yup.string().matches(/world/i),
  });
  expect(accessor.get()).toBe(undefined);
  expect(localStorage.getItem('test')).toBe(null);
});

test('Trusted returns default value when validation fails', () => {
  localStorage.setItem('test', 'hello country');
  const accessor = new Trusted().accessor({
    key: 'test',
    yupSchema: Yup.string().matches(/world/i),
    defaultValue: 'hello world',
  });
  expect(accessor.get()).toBe('hello world');
  expect(localStorage.getItem('test')).toBe('hello world');
});

test('Trusted can accept a unmarshal and marshal function', () => {
  const accessor = new Trusted().accessor({
    key: 'test',
    marshal: (value: string) => `${value} world`,
    unmarshal: (localValue: string) => localValue.substr(0, 5),
  });
  accessor.set('hello');

  expect(localStorage.getItem('test')).toBe('hello world');
  expect(accessor.get()).toBe('hello');
});

test('Trusted can marshal default values', () => {
  const accessor = new Trusted().accessor<TestObject>({
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

test('Trusted throws an error when default value doesnt pass validation', () => {
  const accessor = new Trusted().accessor({
    key: 'test',
    defaultValue: 'hello country',
    yupSchema: Yup.string().matches(/world/i),
  });
  expect(() => accessor.get()).toThrow(Error);
});

test('Trusted does nothing when setting an invalid value', () => {
  const accessor = new Trusted().accessor({
    key: 'test',
    yupSchema: Yup.string().matches(/world/i),
  });
  accessor.set('hello country');
  expect(console.error).toHaveBeenCalled();
  expect(accessor.get()).toBe(undefined);
});

test('Trusted string can set and get strings', () => {
  const testString = new Trusted().string({
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

test('Trusted boolean can set and get booleans', () => {
  const testBoolean = new Trusted().boolean({
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

test('Trusted number can set and get numbers', () => {
  const testNumber = new Trusted().number({
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

test('Trusted object can set and get objects', () => {
  const testObject = new Trusted().object<TestObject>({
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

test('Trusted array can set and get arrays', () => {
  const testArray = new Trusted().array<TestObject[]>({
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

test('Trusted Map can set and get Maps', () => {
  const defaultMap = new Map<string, TestObject>();
  defaultMap.set('world', { hello: 'world' });

  const testMap = new Trusted().map<string, TestObject>({
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

test('Trusted can take a namespace for all keys', () => {
  const accessor = new Trusted({ namespace: 'blue-' }).accessor({
    key: 'test',
  });

  accessor.set('hello world');
  expect(localStorage.getItem('test')).toBe(null);
  expect(localStorage.getItem('blue-test')).toBe('hello world');
  expect(accessor.get()).toBe('hello world');
});

test('Trusted throws when registering duplicate keys', () => {
  const schema = new Trusted();
  schema.object({ key: 'test' });
  expect(() => schema.string({ key: 'test' })).toThrow();
});

test('Trusted can define an accessor multiple times if registerKey is false', () => {
  const schema = new Trusted();
  schema.object({ key: 'test', skipRegistration: true });
  expect(() =>
    schema.object({ key: 'test', skipRegistration: true })
  ).not.toThrow();
});

test('Trusted removes key registration on accessor.remove', () => {
  const schema = new Trusted();
  const accessor = schema.object({ key: 'test' });
  accessor.remove();
  expect(() => schema.object({ key: 'test' })).not.toThrow();
});