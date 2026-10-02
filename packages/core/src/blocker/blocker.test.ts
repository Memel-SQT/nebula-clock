import { normalizeAppName, normalizeList, normalizeSite } from './index.js';

describe('normalizeSite', () => {
  it('reduces a pasted address to its hostname', () => {
    expect(normalizeSite('https://www.YouTube.com/watch?v=1')).toBe('youtube.com');
    expect(normalizeSite('  news.ycombinator.com  ')).toBe('news.ycombinator.com');
    expect(normalizeSite('http://user:pw@reddit.com:8080/r/x')).toBe('reddit.com');
    expect(normalizeSite('xn--bcher-kva.example')).toBe('xn--bcher-kva.example');
  });

  it('rejects anything that could inject a hosts file line', () => {
    expect(normalizeSite('evil.com 1.2.3.4 bank.com')).toBeNull();
    expect(normalizeSite('evil.com\n1.2.3.4 bank.com')).toBeNull();
    expect(normalizeSite('# comment')).toBeNull();
    expect(normalizeSite('localhost')).toBeNull();
    expect(normalizeSite('127.0.0.1')).toBeNull();
    expect(normalizeSite('')).toBeNull();
  });
});

describe('normalizeAppName', () => {
  it('keeps executable names and rejects paths', () => {
    expect(normalizeAppName(' Discord.exe ')).toBe('Discord.exe');
    expect(normalizeAppName('C:\\Games\\game.exe')).toBeNull();
    expect(normalizeAppName('a|b')).toBeNull();
    expect(normalizeAppName('..')).toBeNull();
  });
});

describe('normalizeList', () => {
  it('drops invalid entries and duplicates, in order', () => {
    expect(
      normalizeList(['YouTube.com', 'www.youtube.com', 42, 'bad entry', 'x.org'], normalizeSite),
    ).toEqual(['youtube.com', 'x.org']);
  });
});
