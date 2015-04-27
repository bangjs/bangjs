describe("angular.module('bang')", function () {

	beforeEach(module('bang'));

	var $rootScope, Bacon, bang;
	beforeEach(inject(function (_$rootScope_, _Bacon_, _bang_) {
		$rootScope = _$rootScope_;
		Bacon = _Bacon_;
		bang = _bang_;
	}));

	describe("bang.createScopeStream", function () {

		it("creates an observable of type `Bacon.EventStream`", function () {

			expect(bang.createScopeStream($rootScope, angular.noop)).to.be.instanceof(Bacon.EventStream);

		});

		it("automatically ends as soon as scope is destroyed", function () {

			var scope = $rootScope.$new();

			var onEnd = sinon.spy();

			bang.createScopeStream(scope, angular.noop).onEnd(onEnd);

			scope.$destroy();

			expect(onEnd).to.have.been.calledOnce;

		});

		it("automatically unsubscribes upon stream end", function () {

			var unsubscribe = sinon.spy();

			bang.createScopeStream($rootScope, function (next) {
				next('value');
				return unsubscribe;
			}).subscribe(function () {
				return Bacon.noMore;
			});

			expect(unsubscribe).to.have.been.calledOnce;

		});

		it("passes next and end callback arguments to subscribe function", function () {

			var onValue = sinon.spy(),
				onEnd = sinon.spy();

			var p = bang.createScopeStream($rootScope, function (next, end) {

				next('value');

				end();

			});
			p.onValue(onValue);
			p.onEnd(onEnd);

			expect(onValue).to.have.callCount(1);
			expect(onValue).to.have.been.calledWithExactly('value');
			expect(onEnd).to.have.been.calledOnce;

		});

	});

	describe("bang.createScopeProperty", function () {

		it("creates an observable of type `Bacon.Property`", function () {

			expect(bang.createScopeProperty($rootScope, angular.noop, angular.noop)).to.be.instanceof(Bacon.Property);

		});

		it("always delivers a first event of type `Bacon.Initial`", function () {

			bang.createScopeProperty($rootScope, function () {
				return 'value';
			}, angular.noop).subscribe(function (e) {
				expect(e).to.be.instanceof(Bacon.Initial);
			});

		});

		it("obtains initial value lazily", function () {

			var value = 'value';

			var p = bang.createScopeProperty($rootScope, function () {
				return value;
			}, angular.noop);

			value = value.toUpperCase();

			p.onValue(function (v) {
				expect(v).to.equal(value);
			});

		});

		it("always uses first result of value function argument as initial value", function () {

			var subscribe = sinon.spy();

			var i = 0;
			bang.createScopeProperty($rootScope, function () {
				return i++;
			}, function (next) {
				next();
			}).subscribe(subscribe);

			expect(subscribe.getCall(0).args[0].isInitial()).to.be.true;
			expect(subscribe.getCall(0).args[0].value()).to.equal(0);

		});

		it("passes scope as context to both function arguments", function () {

			bang.createScopeProperty($rootScope, function () {
				expect(this).to.equal($rootScope);
			}, function () {
				expect(this).to.equal($rootScope);
			}).subscribe(angular.noop);

		});

		it("passes next, invalidate and end callback arguments to subscribe function", function () {

			var onValue = sinon.spy(),
				onEnd = sinon.spy();

			var i = 0;
			var p = bang.createScopeProperty($rootScope, function () {
				return 'value' + i++;
			}, function (next, invalidate, end) {

				next();
				next('other value');

				invalidate();
				invalidate('other value');

				end();

			});
			p.onValue(onValue);
			p.onEnd(onEnd);

			expect(onValue).to.have.callCount(5);

			expect(onValue.getCall(0)).to.have.been.calledWithExactly('value0');

			expect(onValue.getCall(1)).to.have.been.calledWithExactly('value1');
			expect(onValue.getCall(2)).to.have.been.calledWithExactly('other value');

			expect(onValue.getCall(3)).to.have.been.calledWithExactly('value2');
			expect(onValue.getCall(4)).to.have.been.calledWithExactly('value3');

			expect(onEnd).to.have.been.calledOnce;

		});

	});

	describe("bang.watchAsProperty", function () {

		it("delivers initial scope property value as initial event value", function () {

			var scope = $rootScope.$new();
			scope.a = 'a';

			bang.watchAsProperty(scope, 'a').subscribe(function (e) {
				expect(e.isInitial()).to.be.true;
				expect(e.value()).to.equal('a');
			});

			bang.watchAsProperty(scope, 'b').subscribe(function (e) {
				expect(e.isInitial()).to.be.true;
				expect(e.value()).to.be.undefined;
			});

		});

		it("will not deliver identical values consecutively", function () {

			var scope = $rootScope.$new();

			var onValue = sinon.spy();

			bang.watchAsProperty(scope, 'b').onValue(onValue);

			scope.b = undefined;
			scope.$digest();

			scope.b = true;
			scope.$digest();

			expect(onValue).to.have.been.calledTwice;

			expect(onValue.getCall(0)).to.have.been.calledWithExactly(undefined);
			expect(onValue.getCall(1)).to.have.been.calledWithExactly(true);

		});

	});

	describe("bang.functionAsStream", function () {

		it("creates a function with given name on given scope", function () {

			var scope = $rootScope.$new();

			bang.functionAsStream(scope, 'fn');

			expect(scope.fn).to.be.a.function;

		});

		it("delivers an event for every function call", function () {

			var scope = $rootScope.$new();

			var onValue = sinon.spy();

			bang.functionAsStream(scope, 'fn').onValue(onValue);

			scope.fn('value');
			scope.fn('value');
			scope.fn(1, 2, 3);

			expect(onValue).to.have.been.calledThrice;
			expect(onValue.getCall(0)).to.have.been.calledWithExactly(['value']);
			expect(onValue.getCall(1)).to.have.been.calledWithExactly(['value']);
			expect(onValue.getCall(2)).to.have.been.calledWithExactly([1, 2, 3]);

		});

		it("swallows any invocations that occur while stream is still lazy", function () {

			var scope = $rootScope.$new();

			var s = bang.functionAsStream(scope, 'fn');

			scope.fn(1);

			s.onValue(function (value) {
				expect(value).to.deep.equal([2]);
			});

			scope.fn(2);

		});

		it("can deal with multiple streams assigned to a single function name", function () {

			var scope = $rootScope.$new();

			var onValue = sinon.spy();

			bang.functionAsStream(scope, 'fn').onValue(onValue);
			bang.functionAsStream(scope, 'fn').onValue(onValue);

			scope.fn('multicast');

			expect(onValue).to.have.been.calledTwice;
			expect(onValue.getCall(0)).to.have.been.calledWithExactly(['multicast']);
			expect(onValue.getCall(1)).to.have.been.calledWithExactly(['multicast']);

		});

	});

	describe("bang.digestObservable", function () {

		it("returns the observable that includes the digest to scope", function () {

			var scope = $rootScope.$new();

			bang.digestObservable(scope, 'name', Bacon.constant('value')).subscribe(angular.noop);

			scope.$evalAsync(function () {
				expect(scope.name).to.equal('value');
			});

		});

		it("will not change the observable's laziness", function () {

			var scope = $rootScope.$new();

			var lazy = bang.digestObservable(scope, 'name', Bacon.constant('value'));

			scope.$evalAsync(function () {
				expect('name' in scope).to.be.false;
			});

			lazy.subscribe(angular.noop);

			scope.$evalAsync(function () {
				expect(scope.name).to.equal('value');
			});

		});

	});

	describe("$rootScope", function () {

		it("exposes all functions from service `bang` on `$rootScope`", function () {

			expect($rootScope.createStream).to.be.a.function;
			expect($rootScope.createProperty).to.be.a.function;
			expect($rootScope.watchAsProperty).to.be.a.function;
			expect($rootScope.functionAsStream).to.be.a.function;
			expect($rootScope.digestObservable).to.be.a.function;

		});

	});

});
