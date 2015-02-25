beforeEach(module('bang'));

var $rootScope, bang, Bacon;
beforeEach(inject(function (_$rootScope_, _bang_, _Bacon_) {
	$rootScope = _$rootScope_;
	bang = _bang_;
	Bacon = _Bacon_;
}));

describe('bang', function () {

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

});
