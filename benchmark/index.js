import { Bench, formatNumber, nToMs } from 'tinybench';
import * as exqs from '@panzi/extended-query-string';
import qs from 'qs';
import { printTable, RoundedTableStyle } from '@panzi/print-table';

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

await stringifyBench.run();

const queryString = exqs.stringify(query);

parseBench.add('extended-query-string', () => exqs.parse(queryString));
parseBench.add('qs', () => qs.parse(queryString));

await parseBench.run();

/** @param {Bench} bench  */
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
            latencyAvg: `${formatNumber(nToMs(result.latency.mean))} \xb1 ${result.latency.rme.toFixed(2).padStart(3)}%  ${(100 * result.latency.mean / maxLatencyAvg).toFixed(0).padStart(3)}%`,
            latencyMed: `${formatNumber(nToMs(result.latency.p50))} \xb1 ${formatNumber(nToMs(result.latency.mad)).padStart(3)}  ${(100 * result.latency.p50 / maxLatencyMed).toFixed(0).padStart(3)}%`,
            throughputAvg: `${Math.round(result.throughput.mean).toString()} \xb1 ${result.throughput.rme.toFixed(2).padStart(3)}%  ${(100 * result.throughput.mean / maxThroughputAvg).toFixed(0).padStart(3)}%`,
            throughputMed: `${Math.round(result.throughput.p50).toString()} \xb1 ${Math.round(result.throughput.mad).toString().padStart(3)}  ${(100 * result.throughput.p50 / maxThroughputMed).toFixed(0).padStart(3)}%`,
            samples: result.latency.samplesCount,
            error: '',
        } :
        result.state !== 'errored' ? {
            name,
            latencyAvg: '',
            latencyMed: '',
            throughputAvg: '',
            throughputMed: '',
            samples: '',
            error: '',
        } :
        {
            name,
            latencyAvg: '',
            latencyMed: '',
            throughputAvg: '',
            throughputMed: '',
            samples: '',
            error: result.error,
        }
    });
}

const header = [
    'Task name', 'Latency avg (ns)', 'Latency med (ns)',
    'Throughput avg (ops/s)', 'Throughput med (ops/s)',
    'Samples',
];

console.log(stringifyBench.name);
printTable(
    getResults(stringifyBench).map(res => [res.name, res.latencyAvg, res.latencyMed, res.throughputAvg, res.throughputMed, res.samples]),
    {
        header,
        alignment: '><<<<<',
        style: RoundedTableStyle
    }
);
console.log();
console.log(parseBench.name);
printTable(
    getResults(parseBench).map(res => [res.name, res.latencyAvg, res.latencyMed, res.throughputAvg, res.throughputMed, res.samples]),
    {
        header,
        alignment: '><<<<<',
        style: RoundedTableStyle
    }
);
