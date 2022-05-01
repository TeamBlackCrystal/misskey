import * as os from 'os';
import * as sysUtils from 'systeminformation';
import * as diskusage from 'diskusage';
import * as Deque from 'double-ended-queue';
import Xev from '@ayuskey/xev';
import * as osUtils from 'os-utils';

const ev = new Xev();

const interval = 1000;

const round = (num: number) => Math.round(num * 10) / 10;

/**
 * Report server stats regularly
 */
export default function() {
	const log = new Deque<any>();

	ev.on('requestServerStatsLog', x => {
		ev.emit(`serverStatsLog:${x.id}`, log.toArray().slice(0, x.length || 50));
	});

	async function tick() {
		const cpu = await cpuUsage();
		const usedmem = await usedMem();
		const memStats = await mem();
		const netStats = await net();
		const fsStats = await fs();
		const totalmem = await totalMem();
		const disk = await diskusage.check(os.platform() == 'win32' ? 'c:' : '/');

		const stats = {
			cpu_usage: cpu,
			mem: {
				total: totalmem,
				used: usedmem,
				active: round(memStats.active),
			},
			disk,
			os_uptime: os.uptime(),
			process_uptime: process.uptime(),
			net: {
				rx: round(Math.max(0, netStats.rx_sec)),
				tx: round(Math.max(0, netStats.tx_sec)),
			},
			fs: {
				r: os.platform() != 'win32' ? round(Math.max(0, fsStats.rIO_sec)) : round(0),
				w: os.platform() != 'win32' ? round(Math.max(0, fsStats.wIO_sec)) : round(0),
			}
		};
		ev.emit('serverStats', stats);
		log.unshift(stats);
		if (log.length > 200) log.pop();
	}

	tick();

	setInterval(tick, interval);
}

// CPU STAT
function cpuUsage() {
	return new Promise((res, rej) => {
		osUtils.cpuUsage((cpuUsage: number) => {
			res(cpuUsage);
		});
	});
}

// MEMORY(excl buffer + cache) STAT
async function usedMem() {
	const data = await sysUtils.mem();
	return data.active;
}

// TOTAL MEMORY STAT
async function totalMem() {
	const data = await sysUtils.mem();
	return data.total;
}

// MEMORY STAT
async function mem() {
	const data = await sysUtils.mem();
	return data;
}

// NETWORK STAT
async function net() {
	const iface = await sysUtils.networkInterfaceDefault();
	const data = await sysUtils.networkStats(iface);
	return data[0];
}

// FS STAT
async function fs() {
	const data = await sysUtils.disksIO().catch(() => ({ rIO_sec: 0, wIO_sec: 0 }));
	return data;
}
