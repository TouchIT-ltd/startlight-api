const fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({}),
  }),
);

export default fetch;
