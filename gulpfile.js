var gulp = require('gulp'),
	gulpConcat = require('gulp-concat');


gulp.task('js', function () {

	return gulp.src([
		'bower_components/angular-testable-controller/dist/atc.js',
		'src/core.js',
		'src/module.js',
		'src/controller.js',
		'src/property.js'
	]).pipe(
		gulpConcat('bang.js')
	).pipe(
		gulp.dest('dist')
	);

});

gulp.task('default', ['js']);
