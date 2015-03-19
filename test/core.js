describe("bang", function () {

	describe("property.watch", function () {

		it("returns a factory method", function () {
			expect(bang.property.watch()).to.be.a.function;
		});

		// Check that it will not end up referencing `arguments[-1]`, as Safari
		// does not [like
		// that](https://twitter.com/timmolendijk/status/578246289554554881) [at
		// all](https://twitter.com/timmolendijk/status/578247051458273280).
		it("does not choke on function as context", function () {
			var spy = sinon.spy();

			var atcDef = bang.property.watch
				.call(spy)
				('elementName');

			atcDef[atcDef.length - 2].call({
				Bacon: Bacon,
				$scope: {
					watchAsProperty: sinon.stub().returns(Bacon.never())
				}
			});
			
			expect(spy).to.not.have.been.called;
		});

	});

});


/*
beforeEach(module('bang'));

var $rootScope, _bang, Bacon;
beforeEach(inject(function (_$rootScope_, _bang_, _Bacon_) {
	$rootScope = _$rootScope_;
	_bang = _bang_;
	Bacon = _Bacon_;
}));

describe('_bang', function () {

	describe('createProperty', function () {

		it("creates property that can send consecutive updates with identical values", function (done) {
			var invalidate;
			var property = bang.createProperty(function () {
				return true;
			}, function (next) {
				invalidate = next;
			});

			property.onValue(_.after(2, function (value) {
				expect(true).to.be.true;

				done();
			}));

			invalidate();
		});

		// TODO: Verify that initial value can also be `null` (or alternative
		// interface with same purpose).

		// TODO: Verify that binder ("invalidate") of property is only called
		// once.

		// TODO: Verify that unsubscribing upon end of listening works.

	});

	describe("createPropertyFromObjectProperty", function () {

		var object;
		beforeEach(function () {
			object = {
				property: 'value'
			};
		});

		it("creates a `Bacon.Property`", function () {
			var property = bang.createPropertyFromObjectProperty(object, 'property');

			expect(property).to.be.instanceof(Bacon.Property);
		});

		it("creates property that has current object property value as initial value", function (done) {
			var property = bang.createPropertyFromObjectProperty(object, 'property');

			property.onValue(function (value) {
				expect(value).to.equal('value');

				done();
			});
		});

		it("creates property that sends update whenever object property changes value", function (done) {
			var property = bang.createPropertyFromObjectProperty(object, 'property');

			property.onValue(_.after(2, function (value) {
				expect(value).to.equal('another value');

				done();
			}));

			object.property = 'another value';
		});

		it("creates property that does not send update until object property exists", function (done) {
			var property = bang.createPropertyFromObjectProperty(object, 'anotherProperty');

			property.onValue(function (value) {
				expect(value).to.equal('value');

				done();
			});

			object.anotherProperty = 'value';
		});

	});

// TODO: These tests are really testing `bang.createConditionalProperty()` so
// better move them to there.

describe("selectChannels.channels", function () {

	var inj = util.mockInjectables({
		CHANNELS: 'server.channels',
		ACTIVE: 'selectChannel.active'
	});

	var Bacon, channels;
	beforeEach(inject(['Bacon', 'selectChannel.channels', function (_Bacon_, _channels_) {
		Bacon = _Bacon_;
		channels = _channels_;
	}]));

	it("is a property", function () {
		expect(channels).to.be.instanceof(Bacon.Property);
	});

	it("does not deliver value until active", function (done) {
		inj.CHANNELS = [];

		channels.onValue(function (value) {
			expect(value).to.equal(inj.CHANNELS);
			expect(inj.ACTIVE).to.be.true;

			done();
		});

		inj.ACTIVE = true;
	});

	it("deactivating and reactivating does not cause the current update to be resent", function (done) {
		inj.ACTIVE = true;
		inj.CHANNELS = [];

		channels.onValue(_.after(2, function (value) {
			expect(value).to.deep.equal(['not empty']);

			done();
		}));

		inj.ACTIVE = false;
		inj.ACTIVE = true;
		// `channels` should not resend value `[]`.

		inj.CHANNELS = ['not empty'];
	});

});

	describe("watchAsProperty", function () {

		it("takes a watcher function and creates a property with its result as initial value", function (done) {
			var property = bang.watchAsProperty($rootScope, function () {
				return 'value';
			});

			expect(property).to.be.instanceof(Bacon.Property);
			property.onValue(function (value) {
				expect(value).to.equal('value');

				done();
			});
		});

		it("creates property that only sends update on value change regardless of digest loop", function (done) {
			var i = 0;
			var property = bang.watchAsProperty($rootScope, function () {
				return i;
			});

			property.onValue(_.after(2, function (value) {
				expect(value).to.equal(1);

				done();
			}));

			// Should not trigger subscription call.
			$rootScope.$digest();

			// Should trigger subscription call.
			i++;
			$rootScope.$digest();
		});

		it("creates property that delivers its latest value regardless of when it is subscribed to", function (done) {
			var i = 0;
			var property = bang.watchAsProperty($rootScope, function () {
				return i;
			});

			i++;

			property.onValue(function (value) {
				expect(value).to.equal(1);

				done();
			});
		});

		it("creates property that delivers its latest value regardless of whether it has been delivered to other subscribers", function (done) {
			var i = 0;
			var property = bang.watchAsProperty($rootScope, function () {
				return i++;
			});

			property.onValue(function (value) {
				expect(value).to.equal(0);
				property.onValue(function (value) {
					expect(value).to.equal(0);

					done();
				});
			});
		});

		it("creates property that can be subscribed to and unsubscribed from repeatedly", function (done) {
			var i = 0;
			var property = bang.watchAsProperty($rootScope, function () {
				return i++;
			});

			var unsubscribe = property.onValue(function (value) {
				expect(value).to.equal(0);
			});

			unsubscribe();

			property.onValue(function (value) {
				expect(value).to.equal(1);

				done();
			});
		});

		xit("creates property that describes ifself properly", function () {
			var property = bang.watchAsProperty($rootScope, 'whatever');

			expect(property.desc.toString()).to.equal('bang.watchAsProperty($rootScope, whatever)');
		});

	});

		// TODO: These tests should move to `bacon.watchAsProperty()` (as far as
		// not already there).
		describe.skip("channelSelectedPk", function () {

			it("is a property", function () {
				expect(ctrl.channelSelectedPk).to.be.instanceof(Bacon.Property);
			});

			it("starts out as `undefined` if `edit.channelPk` does not exist", function (done) {
				ctrl.channelSelectedPk.onValue(function (value) {
					expect(value).to.be.undefined;

					done();
				});
			});

			it("is not impacted by digest loop if state remains unchanged", function (done) {
				ctrl.channelSelectedPk.onValue(function (value) {
					expect(value).to.be.undefined;

					done();
				});

				$scope.$digest();
			});

			it("starts out with the current value of `edit.channelPk` if it exists", function (done) {
				$scope.edit.channelPk = 'hash';

				ctrl.channelSelectedPk.onValue(function (value) {
					expect(value).to.equal('hash');

					done();
				});
			});

			it("follows `edit.channelPk` continuously", function (done) {
				ctrl.channelSelectedPk.onValue(_.after(2, function (value) {
					expect(value).to.equal('hash');

					done();
				}));

				$scope.edit.channelPk = 'hash';
				$scope.$digest();
			});

			it("remembers and always delivers its latest value", function (done) {
				ctrl.channelSelectedPk.onValue(function () {
					ctrl.channelSelectedPk.onValue(function (value) {
						expect(value).to.be.undefined;

						done();
					});
				});
			});

		});

});
*/
