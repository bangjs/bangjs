;!function (global, angular) {

// https://gist.github.com/bittersweetryan/2787854
function flatten(obj,prefix){
 
	var propName = (prefix) ? prefix + '.' :  '',
	    ret = {};

	for(var attr in obj){
	    
	    // TODO: No dependency on lodash please
	    if(_.isPlainObject(obj[attr])){
	        _.extend(ret,flatten(obj[attr], propName + attr));
	    }
	    else{
	        ret[propName + attr] = obj[attr];
	    }
	}
	return ret;
 
}


function atc (moduleName, ctrlName, elements, initElement) {

	var json = {
		nodes: [],
		links: []
	};

	var buildContext;
	angular.module(moduleName).run(['$parse', function ($parse) {

		buildContext = function (deps, injectables, scope, includeShorts) {
			if (arguments.length < 4)
				includeShorts = true;

			var context = {
				$scope: scope
			};

			var prefix = ctrlName + '.';
			deps.forEach(function (dep, i) {
				var inj = injectables[i];
				if (dep.substr(0, prefix.length) === prefix) {
					inj = inj(scope);
					if (includeShorts) {
						// Enable `context['.controllerLevel.service']`
						context[dep.substr(prefix.length - 1)] = inj;
						// Enable `context.controllerLevel.service`
						$parse(dep.substr(prefix.length)).assign(context, inj);
					}
				}
				context[dep] = inj;
			});

			return context;
		};

	}]);

	angular.module(moduleName).config(['$provide', '$controllerProvider', function ($provide, $controllerProvider) {

		var ctrlDeps = [],
			ctrlBehavior = {};

		elements = flatten(elements);

		angular.forEach(elements, function (element, elementName) {
			if (angular.isFunction(initElement))
				element = initElement(elementName, element);

			if (!angular.isArray(element))
				element = [element];

			var invokable = element.filter(function (part) {
				return angular.isFunction(part);
			});

			var svcSetup = invokable[0],
				svcBehavior = invokable[1],
				svcDeps = element.slice(0, element.indexOf(svcSetup)).map(function (dep) {
					if (dep.charAt(0) === '.')
						dep = ctrlName + dep;
					// TODO: Would be nice if we could also resolve stuff like
					// `.edit` into `controller.edit.x`, `controller.edit.y`
					// etcetera.
					return dep;
				});

			var svcName = [ctrlName, elementName].join('.');

			json.nodes.push({
				name: elementName,
				group: ctrlName,
				// TODO: Naming
				// setup: svcSetup && svcSetup.toString(),
				// behavior: svcBehavior && svcBehavior.toString(),
				deps: element.slice(0, element.indexOf(svcSetup))
			});

			ctrlDeps.push(svcName);

			var svc = function () {
				var svcArgs = [].slice.call(arguments);

				if (angular.isFunction(svcBehavior))
					ctrlBehavior[svcName] = function (scope, value) {
						svcBehavior.call(buildContext(svcDeps, svcArgs, scope), value);
					};

				// TODO: Do not depend on lodash, and use instance of internal
				// object type to detect whether scope should be inserted(?)
				return _.memoize(function (scope) {
					return svcSetup.call(buildContext(svcDeps, svcArgs, scope));
				}, function (scope) {
					return scope.$id;
				});
			};
			svc.$inject = svcDeps;

			$provide.factory(svcName, svc);
		});

		var ctrl = function ($scope) {

			// TODO: If we would use the short names as keys in `ctrlDeps`, we
			// could build a context with only short names, which then would
			// also make more sense when extending `this`.

			var context = buildContext(ctrlDeps, [].slice.call(arguments, 1), $scope, false);

			angular.forEach(context, function (value, dep) {
				if (dep in ctrlBehavior)
					ctrlBehavior[dep]($scope, value);
			});

			angular.extend(this, context);

			this.serialize = json.graphviz;

		};
		ctrl.$inject = ['$scope'].concat(ctrlDeps);

		$controllerProvider.register(ctrlName, ctrl);

	}]);

	json.addLinks = function () {
		var extIncluded = [];

		json.nodes.forEach(function (node, targetIndex) {
			node.deps.forEach(function (dep) {
				if (dep.charAt(0) !== '.') {
					return;	// remove to include external deps
					if (extIncluded.indexOf(dep) === -1) {
						extIncluded.push(dep);
						json.nodes.push({
							name: dep,
							group: '[external]'
						});
					}
				}

				var link = {};
				json.nodes.some(function (node, sourceIndex) {
					if (node.name !== (dep.charAt(0) === '.' ? dep.substr(1) : dep)) return false;
					link.source = sourceIndex;
					return true;
				});
				link.target = targetIndex;
				link.value = 1;
				json.links.push(link);
			});
		});

		json.addLinks = function () {};
	};

	json.graphviz = function () {
		json.addLinks();

		var gv = "digraph {";
		json.nodes.forEach(function (node) {
			gv += '"' + node.name + '";';
		});
		json.links.forEach(function (link) {
			gv += '"' + json.nodes[link.source].name + '" -> "' + json.nodes[link.target].name + '";';
		});
		gv += "}";

		return gv;
	};

	return json;

};

global.atc = atc;

}(window, angular);
