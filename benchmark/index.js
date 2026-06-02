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

const stringifyBracketsBench = new Bench({ name: 'stringify brackets', time: 500 });
const stringifyIndicesBench = new Bench({ name: 'stringify indices', time: 500 });
const parseBracketsBench = new Bench({ name: 'parse brackets', time: 500 });
const parseIndicesBench = new Bench({ name: 'parse indices', time: 500 });

/**
 * @type {Bench[]}
 */
const benches = [stringifyBracketsBench, stringifyIndicesBench, parseBracketsBench, parseIndicesBench];

stringifyBracketsBench.add('extended-query-string', () => exqs.stringify(query, { arrayFormat: 'brackets' }));
stringifyBracketsBench.add('qs', () => qs.stringify(query, { arrayFormat: 'brackets' }));
//stringifyBench.add('query-string', () => QueryString.stringify(query, { arrayFormat: 'bracket' }));


stringifyIndicesBench.add('extended-query-string', () => exqs.stringify(query, { arrayFormat: 'indices' }));
stringifyIndicesBench.add('qs', () => qs.stringify(query, { arrayFormat: 'indices' }));
//stringifyIndices.add('query-string', () => QueryString.stringify(query, { arrayFormat: 'indices' }));

const bracketsQueryString = exqs.stringify(query, { arrayFormat: 'brackets' });
const indicesQueryString = exqs.stringify(query, { arrayFormat: 'indices' });

parseBracketsBench.add('extended-query-string', () => exqs.parse(bracketsQueryString));
parseBracketsBench.add('qs', () => qs.parse(bracketsQueryString));
//parseBracketsBench.add('query-string', () => QueryString.parse(bracketsQueryString, { arrayFormat: 'bracket' }));

parseIndicesBench.add('extended-query-string', () => exqs.parse(indicesQueryString));
parseIndicesBench.add('qs', () => qs.parse(indicesQueryString));
//parseIndicesBench.add('query-string', () => QueryString.parse(indicesQueryString, { arrayFormat: 'indices' }));

for (const bench of benches) {
    await bench.run();
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
            buf.push('<td align="right">', escapeHtml(cell.trim().replace(/\xa0\xa0+/g, '\xa0')), '</td>');
        }
        buf.push('</tr>\n');
    }
    buf.push(
        '</tbody>\n',
        '</table>\n'
    );
}

/**
 * @typedef {{ name: string, results: FormattedResult[] }} FormattedResults
 */

/** @type {FormattedResults[]} */
const results = benches.map(bench => ({ name: bench.name ?? '', results: getResults(bench) }));

let first = true;
for (const result of results) {
    if (first) {
        first = false;
    } else {
        console.log();
    }
    console.log(result.name);
    printTable(
        makeRows(result.results),
        {
            header,
            alignment: '><<<<<',
            style: RoundedTableStyle
        }
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
