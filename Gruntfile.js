path = require("path");

module.exports = function (grunt) {
	const banner = '/*!\n ZincDB v<%=pkg.version%>\n\n Copyright (c) 2017, Rotem Dan\n Released under the MIT license.\n\n Build date: <%= grunt.template.today("yyyy-mm-dd") %> \n\n Please report any issues at https://github.com/zincbase/zincdb/issues\n*/\n';
	const tsc = 'node node_modules/typescript/lib/tsc';

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		shell: {
			buildDevelopment: {
				options: {
					stdin: false,
					failOnError: true,
				},

				command: tsc + ' --diagnostics',
			},

			buildProduction: {
				options: {
					stdin: false,
					failOnError: true,
				},

				command: tsc + ' -p tsconfig_production.json --diagnostics',
			},
		},

		mochaTest:
		{
			runTestsWithinDevelopmentBuild: {
				options: {
					ui: 'bdd',
					slow: -1,
					timeout: 20000,
					reporter: 'spec',
					quiet: false,
					clearRequireCache: false,
					require: 'expectations'
				},

				src: ['build/development/zincdb.js']
			},

			runInstrumentedTests: {
				options: {
					ui: 'bdd',
					slow: -1,
					timeout: 20000,
					reporter: 'spec',
					quiet: false,
					clearRequireCache: false,
					require: 'expectations'
				},

				src: ['tests/coverage/instrument/build/development/zincdb.js']
			}
		},

		env: {
			coverage: {
				APP_DIR_FOR_CODE_COVERAGE: 'tests/coverage/instrument/build/development'
			}
		},

		instrument: {
			files: 'build/development/zincdb.js',
			options: {
				lazy: true,
				basePath: 'tests/coverage/instrument/'
			}
		},

		storeCoverage: {
			options: {
				dir: 'tests/coverage/reports'
			}
		},

		makeReport: {
			src: 'tests/coverage/reports/**/*.json',
			options: {
				type: 'lcov',
				dir: 'tests/coverage/reports',
				print: 'detail'
			}
		},
		clean: {
			temporaryTestFiles: ['tests/temp/*'],
		},

		concat: {
			addBannerToDevelopmentBuild: {
				src: ['build/development/zincdb.js'],
				dest: 'build/development/zincdb.js',

				options: {
					banner: banner
				}
			},

			addBannerToProductionBuild: {
				src: ['build/production/zincdb.js'],
				dest: 'build/production/zincdb.js',

				options: {
					banner: banner
				}
			}
		},

		uglify: {
			minifyProductionBuild: {
				options: {
					preserveComments: true
				},
				files: {
					'build/production/zincdb.min.js': ['build/production/zincdb.js']
				}
			}
		},

		connect: {
			devserver: {
				options: {
					port: 8888,
					keepalive: true,
				}
			},

			phantomjsTestServer: {
				options: {
					port: 25398,
				}
			}
		},

		mocha_phantomjs: {
			runTests: {
				options: {
					urls: ['http://localhost:25398/tests/index.html']
				}
			}
		}
	});

	require('load-grunt-tasks')(grunt);

	grunt.registerTask('buildDevelopment',
		[
			'shell:buildDevelopment',
			'concat:addBannerToDevelopmentBuild'
		]);

	grunt.registerTask('test',
		[
			'buildDevelopment',
			'mochaTest:runTestsWithinDevelopmentBuild',
			'clean:temporaryTestFiles'
		]);

	grunt.registerTask('test_coverage', [
		'buildDevelopment',
		'env:coverage',
		'instrument',
		'mochaTest:runInstrumentedTests',
		'storeCoverage',
		'makeReport'
	]);

	grunt.registerTask('testPhantomjs',
		[
			'buildDevelopment',
			'connect:phantomjsTestServer',
			'mocha_phantomjs:runTests'
		]);

	grunt.registerTask('buildProduction',
		[
			'shell:buildProduction',
			'concat:addBannerToProductionBuild',
			'uglify:minifyProductionBuild'
		]);

	grunt.registerTask('startDevServer',
		[
			'connect:devserver',
		]);

	grunt.registerTask('default',
		[
			'buildDevelopment',
			'buildProduction'
		]);
};
