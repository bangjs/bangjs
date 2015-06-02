var gulp = require('gulp'),
	gulpConcat = require('gulp-concat'),
	Dgeni = require('dgeni');


gulp.task('js', function () {

	return gulp.src([
		'node_modules/bacon.circuit/dist/bacon.circuit.js',
		'src/core.js',
		'src/location.js',
		'src/bang.js'
	]).pipe(
		gulpConcat('bang.js')
	).pipe(
		gulp.dest('dist')
	);

});

gulp.task('doc', function () {

	// TODO: Clean out previous build before generating new one.
	
	return new Dgeni([require('./dgeni.conf')]).generate();

});

gulp.task('default', ['js', 'doc']);
