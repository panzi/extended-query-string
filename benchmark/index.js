import { Bench, formatNumber, nToMs } from 'tinybench';
import * as exqs from '@panzi/extended-query-string';
import qs from 'qs';
import { printTable, RoundedTableStyle } from '@panzi/print-table';
import fs from 'fs/promises';

// query-string does not support nested objects!
// See: https://www.npmjs.com/package/query-string
// import QueryString from 'query-string';

/** @type {any} */
let deep_nesting = {};
for (let i = 0; i < 32; ++ i) {
    deep_nesting = { [i]: deep_nesting };
}

/** @type {exqs.Query} */
const query = {
    foo: {
        bar: {
            baz: {
                '$egg BÄCON and Spam%': ['bla', '&=% bla'],
            },
            baz2: [
                [1, 2, 3],
                [true, false],
                null,
            ],
        },
        dropped: undefined,
        long_array: Array.from("abdefghijklmnopqrstuvwxyz".repeat(3)),
        LONG_STRING: "abdefghijklmnopqrstuvwxyz".repeat(3),
        deep_nesting,
    }
};

/** @type {exqs.Query} */
const longArrayShortValues = {
    // @ts-ignore
    foo: Array.from(Array(2048).keys()),
};

/** @type {exqs.Query} */
const longArrayBigValues = {
    // @ts-ignore
    foo: Array.from(Array(1024).keys().map(index => Array(100).keys().reduce((o, v) => {
        o[`key${v}`] = `value ${v}`;
        return o;
    }, {
        index,
        deep_nesting,
        LONG_STRING: "abdefghijklmnopqrstuvwxyz".repeat(16),
    }))),
};

/**
 * @type {{
 *   name: string,
 *   query: exqs.Query,
 * }[]}
 */
const TEST_DATA = [
    {
        name: 'Tiny',
        query: {
            foo: {
                bar: 'baz',
            }
        }
    },
    {
        name: 'Somewhat Complex',
        query,
    },
    {
        name: 'Long array with short values',
        query: longArrayShortValues,
    },
    {
        name: 'Long array with big values',
        query: longArrayBigValues,
    },
];


/**
 * @typedef {'brackets'|'indices'} ArrayFormat
 */

/**
 * @param {(query: exqs.Query, options: { readonly arrayFormat: ArrayFormat}) => string} func 
 * @param {exqs.Query} query 
 * @param {{ arrayFormat: ArrayFormat}} options 
 */
function makeStringify(func, query, options) {
    return () => func(query, options);
}

/**
 * @template O
 * @param {(queryString: string, options?: O) => any} func 
 * @param {string} queryString 
 * @param {O=} options
 */
function makeParse(func, queryString, options) {
    return () => func(queryString, options);
}

/**
 * @type {ArrayFormat[]}
 */
const ARRAY_FORMATS = ['brackets', 'indices'];

/**
 * @type {Bench[]}
 */
const benches = [];

const time = 500;

for (const { name, query } of TEST_DATA) {
    for (const arrayFormat of ARRAY_FORMATS) {
        const sBench = new Bench({ name: `Stringify ${name} (${arrayFormat})`, time, warmup: true });
        const pBench = new Bench({ name: `Parse ${name} (${arrayFormat})`, time, warmup: true });

        sBench.add('extended-query-string', makeStringify(exqs.stringify, query, { arrayFormat }));
        sBench.add('qs', makeStringify(qs.stringify, query, { arrayFormat }));

        const queryString = exqs.stringify(query, { arrayFormat });

        pBench.add('extended-query-string', makeParse(exqs.parse, queryString));
        pBench.add('qs', makeParse(qs.parse, queryString, { arrayLimit: Infinity, parameterLimit: Infinity }));

        benches.push(sBench, pBench);
    }
}

const header = [
    'Task name', 'Latency avg (ns)', 'Latency med (ns)',
    'Throughput avg (ops/s)', 'Throughput med (ops/s)',
    'Samples', 'Error',
];

/**
 * @typedef {{ name: string, results: FormattedResult[] }} FormattedResults
 */

/** @type {FormattedResults[]} */
const results = [];

for (const bench of benches) {
    console.log();
    console.log(bench.name);
    await bench.run();

    const benchResults = getResults(bench);

    const hasError = benchResults.some(res => res.error);

    printTable(
        makeRows(benchResults, hasError),
        {
            header: hasError ? header : header.slice(0, header.length - 1),
            alignment: '><<<<<>',
            style: RoundedTableStyle
        }
    );

    results.push({ name: bench.name ?? '', results: benchResults });
}

/**
 * @typedef {{
 *  name: string;
 *  latencyAvg: [string, string, string];
 *  latencyMed: [string, string, string];
 *  throughputAvg: [string, string, string];
 *  throughputMed: [string, string, string];
 *  samples: string;
 *  error: string;
 * }} FormattedResult
 */

/**
 * @param {Bench} bench
 * @returns {FormattedResult[]}
 */
function getResults(bench) {
    let maxLatencyAvg = NaN;
    let maxLatencyMed = NaN;
    let maxThroughputAvg = NaN;
    let maxThroughputMed = NaN;

    for (const { result } of bench.tasks) {
        if (result.state === 'aborted-with-statistics' || result.state === 'completed') {
            const latencyAvg = result.latency.mean;
            const latencyMed = result.latency.p50;
            const throughputAvg = result.throughput.mean;
            const throughputMed = result.throughput.p50;

            if (!(latencyAvg < maxLatencyAvg)) {
                maxLatencyAvg = latencyAvg;
            }

            if (!(latencyMed < maxLatencyMed)) {
                maxLatencyMed = latencyMed;
            }

            if (!(throughputAvg < maxThroughputAvg)) {
                maxThroughputAvg = throughputAvg;
            }

            if (!(throughputMed < maxThroughputMed)) {
                maxThroughputMed = throughputMed;
            }
        }
    }

    return bench.tasks.map(task => {
        const { name, result } = task;

        return result.state === 'aborted-with-statistics' || result.state === 'completed' ? {
            name,
            latencyAvg: [
                formatNumber(nToMs(result.latency.mean)),
                `\xb1\xa0${result.latency.rme.toFixed(2).padStart(4, '\xa0')}%`,
                `${(100 * result.latency.mean / maxLatencyAvg).toFixed(0).padStart(3)}%`,
            ],
            latencyMed: [
                formatNumber(nToMs(result.latency.p50)),
                `\xb1\xa0${formatNumber(nToMs(result.latency.mad)).padStart(4, '\xa0')}`,
                `${(100 * result.latency.p50 / maxLatencyMed).toFixed(0).padStart(3)}%`,
            ],
            throughputAvg: [
                String(Math.round(result.throughput.mean)),
                `\xb1\xa0${result.throughput.rme.toFixed(2).padStart(4, '\xa0')}%`,
                `${(100 * result.throughput.mean / maxThroughputAvg).toFixed(0).padStart(3)}%`,
            ],
            throughputMed: [
                String(Math.round(result.throughput.p50)),
                `\xb1\xa0${formatNumber(Math.round(result.throughput.mad)).padStart(6, '\xa0')}`,
                `${(100 * result.throughput.p50 / maxThroughputMed).toFixed(0).padStart(3)}%`,
            ],
            samples: String(result.latency.samplesCount),
            error: '',
        } :
        result.state !== 'errored' ? {
            name,
            latencyAvg: ['','',''],
            latencyMed: ['','',''],
            throughputAvg: ['','',''],
            throughputMed: ['','',''],
            samples: '',
            error: '',
        } :
        {
            name,
            latencyAvg: ['','',''],
            latencyMed: ['','',''],
            throughputAvg: ['','',''],
            throughputMed: ['','',''],
            samples: '',
            error: String(result.error),
        }
    });
}

/**
 * @param {[string, string, string]} res 
 */
function joinRes(res) {
    return `${res[0]} ${res[1]}  ${res[2]}`;
}

/**
 * @param {FormattedResult[]} result 
 * @param {boolean} hasError
 * @returns {string[][]}
 */
function makeRows(result, hasError) {
    return result.map(res => {
        const row = [
            res.name,
            joinRes(res.latencyAvg),
            joinRes(res.latencyMed),
            joinRes(res.throughputAvg),
            joinRes(res.throughputMed),
            res.samples,
        ];

        if (hasError) {
            row.push(res.error);
        }

        return row;
    });
}

/** @type {{[char: string]: string}} */
const HTML_CHARS = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
};

/**
 * @param {string} text 
 * @returns {string}
 */
function escapeHtml(text) {
    return text.replace(/[<>&"]/g, ch => HTML_CHARS[ch]);
}

/**
 * @param {FormattedResult[]} result 
 * @param {string[]} buf 
 * @returns {void}
 */
function makeHtmlTable(result, buf) {
    const hasError = result.some(res => res.error);

    buf.push(
        '<table>\n',
        '<thead>\n',
        '<tr>'
    );
    buf.push('<th>', escapeHtml(header[0]), '</th>');
    buf.push('<th colspan="3">', escapeHtml(header[1]), '</th>');
    buf.push('<th colspan="3">', escapeHtml(header[2]), '</th>');
    buf.push('<th colspan="3">', escapeHtml(header[3]), '</th>');
    buf.push('<th colspan="3">', escapeHtml(header[4]), '</th>');
    buf.push('<th>', escapeHtml(header[5]), '</th>');
    if (hasError) {
        buf.push('<th>', escapeHtml(header[6]), '</th>');
    }
    buf.push(
        '</tr>\n',
        '</thead>\n',
        '<tbody>\n'
    );
    for (const res of result) {
        buf.push('<tr>');
        buf.push('<td>', escapeHtml(res.name), '</td>');
        for (const cell of [...res.latencyAvg, ...res.latencyMed, ...res.throughputAvg, ...res.throughputMed, res.samples]) {
            buf.push('<td align="right">', escapeHtml(cell.trim().replace(/\xa0\xa0+/g, '\xa0')), '</td>');
        }
        if (hasError) {
            buf.push('<td><pre>', escapeHtml(res.error), '</pre></td>');
        }
        buf.push('</tr>\n');
    }
    buf.push(
        '</tbody>\n',
        '</table>\n'
    );
}

/** @type {string[]} */
const buf = [
    'micro benchmark\n',
    '===============\n',
];
for (const result of results) {
    buf.push('\n');
    buf.push('### ', result.name, '\n');
    makeHtmlTable(result.results, buf);
}

await fs.writeFile('README.md', buf.join(''));
