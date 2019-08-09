import * as converter from "./converter";

let conv: converter.Converter;
beforeAll(() => {
  conv = converter.createConverter();
});
afterAll(() => {
  conv.close();
});

interface Shape {
  color: string;
}

interface Square extends Shape {
  sideLength: number;
}

describe("converter valid", () => {
  it("variables", () => {
    const out = conv.convert(
      "",
      `let x = 123;
const y = 'foo';
var z = true;`
    );
    expect(out.diagnostics).toEqual([]);
    expect(out.output).toEqual(
      `Object.defineProperty(exports, \"__esModule\", { value: true });
let x = 123;
const y = 'foo';
var z = true;
`
    );
    expect(out.declOutput).toEqual(
      `declare let x: number;
declare const y = "foo";
declare var z: boolean;
`
    );
  });

  it("functions", () => {
    const out = conv.convert(
      "",
      `
      function sum(x: number, y: number): number {
        return x + y;
      }
      function* xrange(n: number): IterableIterator<number> {
        for (let i = 0; i < n; i++) {
          yield i;
        }
      }
      async function sleep(ms: number) {
        return new Promise<never>(resolve => {
          setTimeout(resolve, ms);
        });
      }
      `
    );
    expect(out.diagnostics).toEqual([]);
    expect(out.output).toEqual(
      `Object.defineProperty(exports, \"__esModule\", { value: true });
function sum(x, y) {
    return x + y;
}
function* xrange(n) {
    for (let i = 0; i < n; i++) {
        yield i;
    }
}
async function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}
`
    );
    expect(out.declOutput).toEqual(
      `declare function sum(x: number, y: number): number;
declare function xrange(n: number): IterableIterator<number>;
declare function sleep(ms: number): Promise<never>;
`
    );
  });

  it("interfaces and classes", () => {
    const out = conv.convert(
      "",
      `interface Shape {
  color: string;
}

interface Square extends Shape {
  sideLength: number;
}

class SquareImpl implements Square {  
  color: string;
  sideLength: number;

  constructor(color: string, sideLength: number) {
    this.color = color;
    this.sideLength = sideLength;
  }
}
`
    );
    expect(out.diagnostics).toEqual([]);
    expect(out.output)
      .toEqual(`Object.defineProperty(exports, \"__esModule\", { value: true });
class SquareImpl {
    constructor(color, sideLength) {
        this.color = color;
        this.sideLength = sideLength;
    }
}
`);
    expect(out.declOutput).toEqual(`interface Shape {
    color: string;
}
interface Square extends Shape {
    sideLength: number;
}
declare class SquareImpl implements Square {
    color: string;
    sideLength: number;
    constructor(color: string, sideLength: number);
}
`);
  });
});

describe("converter diagnostics", () => {
  it("syntax error", () => {
    const out = conv.convert("", `let x + 10;`);
    expect(out.diagnostics).toEqual([
      {
        category: 1,
        code: 1005,
        length: 1,
        messageText: "',' expected.",
        start: 6
      }
    ]);
  });

  it("type error", () => {
    const out = conv.convert("", `let x: string = 10;`);
    expect(out.diagnostics).toEqual([
      {
        category: 1,
        code: 2322,
        length: 1,
        messageText: "Type '10' is not assignable to type 'string'.",
        start: 4
      }
    ]);
  });

  it("redeclare variable", () => {
    const out = conv.convert("", `let x = 3; let x = 4;`);
    expect(out.diagnostics).toEqual([
      {
        category: 1,
        code: 2451,
        length: 1,
        messageText: "Cannot redeclare block-scoped variable 'x'.",
        start: 4
      },
      {
        category: 1,
        code: 2451,
        length: 1,
        messageText: "Cannot redeclare block-scoped variable 'x'.",
        start: 15
      }
    ]);
  });

  it("wrong implementation", () => {
    const out = conv.convert(
      "",
      `interface Shape {
  color: string;
}  

class ShapeImpl implements Shape {}
`
    );
    expect(out.diagnostics).toEqual([
      {
        category: 1,
        code: 2420,
        length: 9,
        // TODO: Fix this error message.
        messageText: "[object Object]",
        start: 46
      }
    ]);
  });
});