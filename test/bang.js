describe("bang", function () {

	beforeEach(module('bang'));

	var $rootScope, $browser, Bacon, bang;
	beforeEach(inject(function (_$rootScope_, _$browser_, _Bacon_, _bang_) {
		$rootScope = _$rootScope_;
		$browser = _$browser_;
		Bacon = _Bacon_;
		bang = _bang_;
	}));

	describe("Service", function () {

		it("has a toString that returns name", function () {

			var face = new (function Face() {})();
			face.toString = function () {
				return 'faceName';
			};

			var circuit = new bang.Service('circuitName', face, {});

			expect(circuit.toString()).to.equal('circuitName');

		});

		it("has a toString that returns face name if no name", function () {

			var face = new (function Face() {})();
			face.toString = function () {
				return 'faceName';
			};

			var circuit = new bang.Service(undefined, face, {});

			expect(circuit.toString()).to.equal('faceName');

		});

		it("has a toString that returns face constructor name as last resort", function () {

			var face = new (function Face() {})();

			var circuit = new bang.Service(undefined, face, {});

			expect(circuit.toString()).to.equal('Face');

		});

	});

	describe("Scope", function () {

		it("has a toString that returns value postfixed with scope id", function () {

			var scope = $rootScope.$new();

			var circuit = new bang.Scope('circuitName', scope, {});

			expect(circuit.toString()).to.equal('circuitName(' + scope.$id + ')');

		});

	});

	describe("set", function () {

		it("assigns synchronously", function () {

			var scope = $rootScope.$new();

			var circuit = new bang.Scope(undefined, scope, {});

			circuit.set('key', 'value');

			expect(scope.key).to.equal('value');

		});

		it("triggers digest cycle on scope (asynchronously)", function () {

			var scope = $rootScope.$new();

			var circuit = new bang.Scope(undefined, scope, {});

			scope.$watch('key', function (value) {
				expect(value).to.equal('value');
			});

			circuit.set('key', 'value');

			// It's weird that we are needing this private, undocumented service
			// here but it seems necessary because `scope.$evalAsync` uses
			// `$browser.defer` internally and `ngMock` overwrites its regular
			// implementation and provides a flush method.
			$browser.defer.flush();

		});

	});

	describe("promiseConstructor", function () {

		it("is instantiatable into a promise that Bacon can deal with", function (done) {
			
			var circuit = new bang.Service(undefined, {}, {});
			
			var promise = new circuit.promiseConstructor(function (resolve) {
				resolve(1);
			});
			
			Bacon.fromPromise(promise).onValue(function (value) {
				expect(value).to.equal(1);
				
				done();
			});
			
			$rootScope.$digest();
			
		});

	});

	describe("component", function () {

		it("returns circuit context", function () {

			var context = bang.component({}, {
				a: bang.stream(function () {
					return Bacon.once(true);
				}),
				'x.y': bang.stream(function () {
					return Bacon.once(true);
				})
			});

			expect(context.a).to.be.instanceof(Bacon.EventStream);
			expect(context.x.y).to.be.instanceof(Bacon.EventStream);

		});

		it("takes an optional name", function () {

			var context = bang.component('circuitName', {}, {
				a: bang.stream(function () {
					return Bacon.once(true);
				})
			});

			expect(context.a).to.be.instanceof(Bacon.EventStream);

		});

	});

});