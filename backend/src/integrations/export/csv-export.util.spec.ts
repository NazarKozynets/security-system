import { buildCsv, toCsvRow } from './csv-export.util';

describe('csv-export.util', () => {
  it('escapes commas and quotes in toCsvRow', () => {
    expect(toCsvRow(['a', 'b,c', 'say "hi"'])).toBe('a,"b,c","say ""hi"""');
  });

  it('builds csv with header and rows', () => {
    const csv = buildCsv(
      ['x', 'y'],
      [
        [1, 2],
        ['a', 'b'],
      ],
    );
    expect(csv).toContain('x,y');
    expect(csv).toContain('1,2');
    expect(csv).toContain('a,b');
  });
});
