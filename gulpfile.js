var gulp = require('gulp'),
	gulpConcat = require('gulp-concat'),
	Dgeni = require('dgeni');


gulp.task('js', function () {

	return gulp.src([
		'src/core.js',
		'src/bacon.js',
		'src/scope.js',
		'src/location.js',
		'src/controller.js',
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
