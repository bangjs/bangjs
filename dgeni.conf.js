var Package = require('dgeni').Package;

module.exports = new Package('bang', [
	require('dgeni-packages/ngdoc')
]).

config(function (log) {

	log.level = 'warn';

}).

config(function (readFilesProcessor, writeFilesProcessor) {

	readFilesProcessor.basePath = '.';
	readFilesProcessor.sourceFiles = [{
		basePath: 'src',
		include: 'src/**/*.js'
	}];

	writeFilesProcessor.outputFolder = 'doc/build';

}).

config(function (templateFinder) {

	templateFinder.templateFolders.unshift('doc/template');

	templateFinder.templatePatterns = [
		'${ doc.template }',
		'${ doc.id }.${ doc.docType }.md',
		'${ doc.id }.md',
		'${ doc.docType }.md',
		'empty.md'
	];

}).

config(function (computePathsProcessor) {

	computePathsProcessor.pathTemplates = [{
		docTypes: ['service'],
		pathTemplate: '.',
		outputPathTemplate: '${ module }/${ name }.md'
	}, {
		docTypes: ['module'],
		pathTemplate: '.',
		outputPathTemplate: '${ name }/index.md'
	}, {
		docTypes: ['componentGroup'],
		pathTemplate: '.',
		// TODO: Is this really the recommended approach to prevent this
		// document to end up in its own rendered page?
		outputPathTemplate: '/dev/null'
	}];

});
