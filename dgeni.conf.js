var Package = require('dgeni').Package;

module.exports = new Package('bang', [
	require('dgeni-packages/ngdoc')
]).

config(function (log, getLinkInfo) {

	log.level = 'warn';

	getLinkInfo.relativeLinks = true;

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
		'base.md'
	];

}).

config(function (inlineTagProcessor, getInjectables) {

	[].push.apply(
		inlineTagProcessor.inlineTagDefinitions,
		getInjectables([
			require('./doc/lib/inline-tag-defs/link')
		])
	);

}).

config(function (computePathsProcessor) {

	computePathsProcessor.pathTemplates = [{
		docTypes: ['service'],
		pathTemplate: '${ name }.md',
		outputPathTemplate: '${ module }/${ name }.md'
	}, {
		docTypes: ['module'],
		pathTemplate: 'index.md',
		outputPathTemplate: '${ name }/index.md'
	}, {
		docTypes: ['componentGroup'],
		// TODO: Is this really the recommended approach to prevent this
		// document to end up in its own rendered page?
		pathTemplate: '.',
		outputPathTemplate: '/dev/null'
	}];

});
