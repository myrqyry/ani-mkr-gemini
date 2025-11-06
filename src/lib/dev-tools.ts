export const devTools = {
  logState: (state: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 State Debug');
      console.log(state);
      console.groupEnd();
    }
  },
  performance: {
    mark: (name: string) => performance.mark(name),
    measure: (name: string, start: string) =>
      performance.measure(name, start),
  },
};
