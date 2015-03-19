var gulp = require('gulp'),
	gulpConcat = require('gulp-concat');


gulp.task('js', function () {

	return gulp.src([
		'src/core.js'
	]).pipe(
		gulpConcat('atc.js')
	).pipe(
		gulp.dest('dist')
	);

});

gulp.task('default', ['js']);
