var INLINE_LINK = /(\S+)(?:\s+([\s\S]+))?/;

module.exports = function linkInlineTagDef(getLinkInfo, createDocMessage) {

	return {
		name: 'link',
		description: "Process inline link tags (of the form {@link some/uri Some Title}), replacing them with Markdown anchors",
		handler: function (doc, tagName, tagDescription) {
			return tagDescription.replace(INLINE_LINK, function (match, uri, title) {

				// TODO: If we do not disable relative links, it will generate
				// incorrect links. This should not be the case I believe, so
				// investigate and get rid of this temporary work-around.
				getLinkInfo.relativeLinks = false;
				
				var linkInfo = getLinkInfo(uri, title, doc);

				// Work around `getLinkInfo`'s false assumption that output
				// format is always HTML.
				linkInfo.title = linkInfo.title.
					replace(/^<code>(.*)<\/code>$/g, function (original, stripped) {
						return "`" + stripped + "`";
					});

				if (!linkInfo.valid)
					throw new Error(createDocMessage(linkInfo.error, doc));

				return '[' + linkInfo.title + '](' + linkInfo.url + ')';
			});
		}
	};

};
