import { Bench, formatNumber, nToMs } from 'tinybench';
import * as exqs from '@panzi/extended-query-string';
import qs from 'qs';
import { printTable, RoundedTableStyle } from '@panzi/print-table';
import fs from 'fs/promises';

// query-string does not support nested objects!
// See: https://www.npmjs.com/package/query-string
// import QueryString from 'query-string';

const stringifyBench = new Bench({ name: 'stringify', time: 500 });
const parseBench = new Bench({ name: 'parse', time: 500 });

/** @type {any} */
let deep_nesting = {};
for (let i = 0; i < 32; ++ i) {
    deep_nesting = { [i]: deep_nesting };
}

/** @type {import('@panzi/extended-query-string').Query} */
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

stringifyBench.add('extended-query-string', () => exqs.stringify(query));
stringifyBench.add('qs', () => qs.stringify(query, { arrayFormat: 'brackets' }));
//stringifyBench.add('query-string', () => QueryString.stringify(query, { arrayFormat: 'bracket' }));

await stringifyBench.run();

const queryString = exqs.stringify(query);

parseBench.add('extended-query-string', () => exqs.parse(queryString));
parseBench.add('qs', () => qs.parse(queryString));
//parseBench.add('query-string', () => QueryString.parse(queryString, { arrayFormat: 'bracket' }));

await parseBench.run();

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
            latencyAvg: [formatNumber(nToMs(result.latency.mean)), `\xb1 ${result.latency.rme.toFixed(2).padStart(3)}%`, `${(100 * result.latency.mean / maxLatencyAvg).toFixed(0).padStart(3)}%`],
            latencyMed: [formatNumber(nToMs(result.latency.p50)), `\xb1 ${formatNumber(nToMs(result.latency.mad)).padStart(3)}`, `${(100 * result.latency.p50 / maxLatencyMed).toFixed(0).padStart(3)}%`],
            throughputAvg: [String(Math.round(result.throughput.mean)), `\xb1 ${result.throughput.rme.toFixed(2).padStart(3)}%`, `${(100 * result.throughput.mean / maxThroughputAvg).toFixed(0).padStart(3)}%`],
            throughputMed: [String(Math.round(result.throughput.p50)), `\xb1 ${formatNumber(Math.round(result.throughput.mad)).padStart(3)}`, `${(100 * result.throughput.p50 / maxThroughputMed).toFixed(0).padStart(3)}%`],
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
            error: result.error.stack || String(result.error),
        }
    });
}

const header = [
    'Task name', 'Latency avg (ns)', 'Latency med (ns)',
    'Throughput avg (ops/s)', 'Throughput med (ops/s)',
    'Samples',
];

/**
 * @param {[string, string, string]} res 
 */
function joinRes(res) {
    return `${res[0]} ${res[1]}  ${res[2]}`;
}

/**
 * @param {FormattedResult[]} result 
 * @returns {string[][]}
 */
function makeRows(result) {
    return result.map(res => [res.name, joinRes(res.latencyAvg), joinRes(res.latencyMed), joinRes(res.throughputAvg), joinRes(res.throughputMed), res.samples]);
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
    buf.push(
        '</tr>\n',
        '</thead>\n',
        '<tbody>\n'
    );
    for (const res of result) {
        buf.push('<tr>');
        buf.push('<td>', escapeHtml(res.name), '</td>');
        for (const cell of [...res.latencyAvg, ...res.latencyMed, ...res.throughputAvg, ...res.throughputMed, res.samples]) {
            buf.push('<td align="right">', escapeHtml(cell), '</td>');
        }
        buf.push('</tr>\n');
    }
    buf.push(
        '</tbody>\n',
        '</table>\n'
    );
}

const stringifyResult = getResults(stringifyBench);
const parseResult = getResults(parseBench);

console.log(stringifyBench.name);
printTable(
    makeRows(stringifyResult),
    {
        header,
        alignment: '><<<<<',
        style: RoundedTableStyle
    }
);
console.log();
console.log(parseBench.name);
printTable(
    makeRows(parseResult),
    {
        header,
        alignment: '><<<<<',
        style: RoundedTableStyle
    }
);

/** @type {string[]} */
const buf = [
    'micro benchmark\n',
    '===============\n',
    '\n',
];

buf.push('### stringify\n');
makeHtmlTable(stringifyResult, buf);
buf.push('\n');
buf.push('### parse\n');
makeHtmlTable(parseResult, buf);

await fs.writeFile('README.md', buf.join(''));
