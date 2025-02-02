/**
 * Gulp tasks
 */

import * as gulp from 'gulp';
import tslint from 'gulp-tslint';
const stylus = require('gulp-stylus');
import rimraf from 'rimraf';
import chalk from 'chalk';
import rename from 'gulp-rename';
const replace = require('gulp-replace');
const cleanCSS = require('gulp-clean-css');
const terser = require('gulp-terser');

const locales = require('./locales');

const env = process.env.NODE_ENV || 'development';
const isDebug = env !== 'production';

if (isDebug) {
	console.warn(chalk.yellow.bold('WARNING! NODE_ENV is not "production".'));
	console.warn(chalk.yellow.bold('         built script will not be compressed.'));
}

gulp.task('build:copy:views', () =>
	gulp.src('./src/server/web/views/**/*').pipe(gulp.dest('./built/server/web/views'))
);

gulp.task('build:copy:fonts', () =>
	gulp.src('./node_modules/three/examples/fonts/**/*').pipe(gulp.dest('./built/client/assets/fonts/'))
);

gulp.task('build:copy:docs', () =>
	gulp.src('./src/docs/*/*.md').pipe(gulp.dest('./built/docs/'))
);

gulp.task('build:copy', gulp.parallel('build:copy:views', 'build:copy:fonts', 'build:copy:docs', () =>
	gulp.src([
		'./src/const.json',
		'./src/emojilist.json',
		'./src/server/web/views/**/*',
		'./src/**/assets/**/*',
		'!./src/client/app/**/assets/**/*'
	]).pipe(gulp.dest('./built/'))
));

gulp.task('lint', () =>
	gulp.src('./src/**/*.ts')
		.pipe(tslint({
			formatter: 'verbose'
		}))
		.pipe(tslint.report())
);

gulp.task('format', () =>
	gulp.src('./src/**/*.ts')
		.pipe(tslint({
			formatter: 'verbose',
			fix: true
		}))
		.pipe(tslint.report())
);

gulp.task('clean', cb =>
	rimraf('./built', cb)
);

gulp.task('cleanall', gulp.parallel('clean', cb =>
	rimraf('./node_modules', cb)
));

gulp.task('build:client:script', () => {
	const client = require('./built/meta.json');
	return gulp.src(['./src/client/app/boot.js', './src/client/app/safe.js'])
		.pipe(replace('VERSION', JSON.stringify(client.version)))
		.pipe(replace('ENV', JSON.stringify(env)))
		.pipe(replace('LANGS', JSON.stringify(Object.keys(locales))))
		.pipe(terser({
			toplevel: true
		}))
		.pipe(gulp.dest('./built/client/assets/'));
});

gulp.task('build:client:styles', () =>
	gulp.src('./src/client/app/init.css')
		.pipe(cleanCSS())
		.pipe(gulp.dest('./built/client/assets/'))
);

gulp.task('copy:client', () =>
		gulp.src([
			'./assets/**/*',
			'./src/client/assets/**/*',
			'./src/client/app/*/assets/**/*'
		])
			.pipe(rename(path => {
				path.dirname = path.dirname!.replace('assets', '.');
			}))
			.pipe(gulp.dest('./built/client/assets/'))
);

gulp.task('doc', () =>
	gulp.src('./src/docs/**/*.styl')
		.pipe(stylus())
		.pipe(cleanCSS())
		.pipe(gulp.dest('./built/docs/assets/'))
);

gulp.task('build:client', gulp.parallel(
	'build:client:script',
	'build:client:styles',
	'copy:client'
));

gulp.task('build', gulp.parallel(
	'build:copy',
	'build:client',
	'doc'
));

gulp.task('default', gulp.task('build'));
