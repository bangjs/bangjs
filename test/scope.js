describe("bang.scope", function () {

	beforeEach(module('bang'));

	var $rootScope, Bacon;
	beforeEach(inject(function (_$rootScope_, _Bacon_) {
		$rootScope = _$rootScope_;
		Bacon = _Bacon_;
	}));

	var bs;
	beforeEach(inject(['bang.scope', function (_bs_) {
		bs = _bs_;
	}]));

	describe("createStream", function () {

		it("creates an observable of type `Bacon.EventStream`", function () {

			expect(bs.createStream($rootScope, angular.noop)).to.be.instanceof(Bacon.EventStream);

		});

		it("automatically ends as soon as scope is destroyed", function () {

			var scope = $rootScope.$new();

			var onEnd = sinon.spy();

			bs.createStream(scope, angular.noop).onEnd(onEnd);

			scope.$destroy();

			expect(onEnd).to.have.been.calledOnce;

		});

		it("automatically unsubscribes upon stream end", function () {

			var unsubscribe = sinon.spy();

			bs.createStream($rootScope, function (next) {
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

			var stream = bs.createStream($rootScope, function (next, end) {

				next('value');

				end();

			});
			stream.onValue(onValue);
			stream.onEnd(onEnd);

			expect(onValue).to.have.callCount(1);
			expect(onValue).to.have.been.calledWithExactly('value');
			expect(onEnd).to.have.been.calledOnce;

		});

	});

	describe("createProperty", function () {

		it("creates an observable of type `Bacon.Property`", function () {

			expect(bs.createProperty($rootScope, angular.noop, angular.noop)).to.be.instanceof(Bacon.Property);

		});

		it("always delivers a first event of type `Bacon.Initial`", function () {

			bs.createProperty($rootScope, function () {
				return 'value';
			}, angular.noop).subscribe(function (e) {
				expect(e).to.be.instanceof(Bacon.Initial);
			});

		});

		it("obtains initial value lazily", function () {

			var value = 'value';

			var prop = bs.createProperty($rootScope, function () {
				return value;
			}, angular.noop);

			value = value.toUpperCase();

			prop.onValue(function (v) {
				expect(v).to.equal(value);
			});

		});

		it("always uses first result of value function argument as initial value", function () {

			var subscribe = sinon.spy();

			var i = 0;
			bs.createProperty($rootScope, function () {
				return i++;
			}, function (next) {
				next();
			}).subscribe(subscribe);

			expect(subscribe.getCall(0).args[0].isInitial()).to.be.true;
			expect(subscribe.getCall(0).args[0].value()).to.equal(0);

		});

		it("passes scope as context to both function arguments", function () {

			bs.createProperty($rootScope, function () {
				expect(this).to.equal($rootScope);
			}, function () {
				expect(this).to.equal($rootScope);
			}).subscribe(angular.noop);

		});

		it("passes next, invalidate and end callback arguments to subscribe function", function () {

			var onValue = sinon.spy(),
				onEnd = sinon.spy();

			var i = 0;
			var prop = bs.createProperty($rootScope, function () {
				return 'value' + i++;
			}, function (next, invalidate, end) {

				next();
				next('other value');

				invalidate();
				invalidate('other value');

				end();

			});
			prop.onValue(onValue);
			prop.onEnd(onEnd);

			expect(onValue).to.have.callCount(5);

			expect(onValue.getCall(0)).to.have.been.calledWithExactly('value0');

			expect(onValue.getCall(1)).to.have.been.calledWithExactly('value1');
			expect(onValue.getCall(2)).to.have.been.calledWithExactly('other value');

			expect(onValue.getCall(3)).to.have.been.calledWithExactly('value2');
			expect(onValue.getCall(4)).to.have.been.calledWithExactly('value3');

			expect(onEnd).to.have.been.calledOnce;

		});

	});

	describe("watchAsProperty", function () {

		it("delivers initial scope property value as initial event value", function () {

			var scope = $rootScope.$new();
			scope.a = 'a';

			bs.watchAsProperty(scope, 'a').subscribe(function (e) {
				expect(e.isInitial()).to.be.true;
				expect(e.value()).to.equal('a');
			});

			bs.watchAsProperty(scope, 'b').subscribe(function (e) {
				expect(e.isInitial()).to.be.true;
				expect(e.value()).to.be.undefined;
			});

		});

		it("will not deliver identical values consecutively", function () {

			var scope = $rootScope.$new();

			var onValue = sinon.spy();

			bs.watchAsProperty(scope, 'b').onValue(onValue);

			scope.b = undefined;
			scope.$digest();

			scope.b = true;
			scope.$digest();

			expect(onValue).to.have.been.calledTwice;

			expect(onValue.getCall(0)).to.have.been.calledWithExactly(undefined);
			expect(onValue.getCall(1)).to.have.been.calledWithExactly(true);

		});

	});

	describe("functionAsStream", function () {

		it("creates a function with given name on given scope", function () {

			var scope = $rootScope.$new();

			bs.functionAsStream(scope, 'fn');

			expect(scope.fn).to.be.a.function;

		});

		it("understands nested names", function () {

			var scope = $rootScope.$new();

			bs.functionAsStream(scope, 'ns.fn');
			bs.functionAsStream(scope, 'ns.fn2');

			expect(scope.ns.fn).to.be.a.function;
			expect(scope.ns.fn2).to.be.a.function;
			
		});

		it("delivers an event for every function call", function () {

			var scope = $rootScope.$new();

			var onValue = sinon.spy();

			bs.functionAsStream(scope, 'fn').onValue(onValue);

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

			var stream = bs.functionAsStream(scope, 'fn');

			scope.fn(1);

			stream.onValue(function (value) {
				expect(value).to.deep.equal([2]);
			});

			scope.fn(2);

		});

		it("can deal with multiple streams assigned to a single function name", function () {

			var scope = $rootScope.$new();

			var onValue = sinon.spy();

			bs.functionAsStream(scope, 'fn').onValue(onValue);
			bs.functionAsStream(scope, 'fn').onValue(onValue);

			scope.fn('multicast');

			expect(onValue).to.have.been.calledTwice;
			expect(onValue.getCall(0)).to.have.been.calledWithExactly(['multicast']);
			expect(onValue.getCall(1)).to.have.been.calledWithExactly(['multicast']);

		});

		it("will never assign two streams to the same function if their scopes differ", function () {

			var scope1 = $rootScope.$new(),
				scope2 = $rootScope.$new();

			var onValue1 = sinon.spy(),
				onValue2 = sinon.spy();

			bs.functionAsStream(scope1, 'fn').onValue(onValue1);
			bs.functionAsStream(scope2, 'fn').onValue(onValue2);

			scope1.fn('unicast');

			expect(onValue1).to.have.been.calledOnce;
			expect(onValue2).to.have.not.been.called;

		});

	});

	describe("digestObservable", function () {

		it("returns the observable that includes the digest to scope", function () {

			var scope = $rootScope.$new();

			bs.digestObservable(scope, 'name', Bacon.constant('value')).subscribe(angular.noop);

			scope.$evalAsync(function () {
				expect(scope.name).to.equal('value');
			});

		});

		it("will not change the observable's laziness", function () {

			var scope = $rootScope.$new();

			var lazy = bs.digestObservable(scope, 'name', Bacon.constant('value'));

			scope.$evalAsync(function () {
				expect('name' in scope).to.be.false;
			});

			lazy.subscribe(angular.noop);

			scope.$evalAsync(function () {
				expect(scope.name).to.equal('value');
			});

		});

	});

	it("exposes all functions from service `bang.scope` on `$rootScope`", function () {
		
		expect(Object.keys(Object.getPrototypeOf($rootScope))).to.include.members(Object.keys(bs));

	});

});