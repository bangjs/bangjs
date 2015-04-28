var INLINE_LINK = /(\S+)(?:\s+([\s\S]+))?/;

module.exports = function linkInlineTagDef (getLinkInfo, createDocMessage) {

	return {
		name: 'link',
		description: "Process inline link tags (of the form {@link some/uri Some Title}), replacing them with Markdown anchors",
		handler: function (doc, tagName, tagDescription) {

			return tagDescription.replace(INLINE_LINK, function (match, uri, title) {

				var linkInfo = getLinkInfo(uri, title, doc);

				if (!linkInfo.valid)
					throw new Error(createDocMessage(linkInfo.error, doc));

				return '[' + linkInfo.title + '](' + linkInfo.url + ')';
			});
		}
	};

};
