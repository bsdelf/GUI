const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const babel = require('gulp-babel');
const sourceMaps = require('gulp-sourcemaps');

const config = {
    input: ['./src/**/*.js'],
    output: './build',
    sourceRoot: path.join(__dirname, 'src')
};

gulp.task('build', () => {
    const babelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '.babelrc')));
    const babelInstance = babel(babelConfig);
    return gulp
        .src(config.input)
        .pipe(sourceMaps.init())
        .pipe(babelInstance)
        .pipe(sourceMaps.write('.', {
            includeContent: false,
            sourceRoot: config.sourceRoot
        }))
        .pipe(gulp.dest(config.output));
});
