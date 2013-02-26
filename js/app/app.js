/**
 * Main application container for the Legislature Tracker
 *
 * An 'e' prefix is referring to editorialized content.
 */
(function($, w, undefined) {

  LT.Application = Backbone.Router.extend({
    routes: {
      'categories': 'categories',
      'category/:category': 'category',
      'bill/:bill': 'bill',
      '*defaultR': 'defaultR'
    },
  
    initialize: function(options) {
      options = LT.options = _.extend(LT.defaultOptions, options);
      this.options = options;
      this.options.app = this;
      
      // Bind to help with some event callbacks
      _.bindAll(this);
      
      // Main view for application
      this.mainView = new LT.MainApplicationView(options);
      this.mainView.router = this;
      this.mainView.loading();
      
      // Get data from spreadsheets
      this.tabletop = Tabletop.init({
        key: this.options.dataKey,
        callback: this.loadEBills,
        callbackContext: this,
        wanted: this.options.eBillsWanted
      });
    },
    
    // Function to call when bill data is loaded
    loadEBills: function(data, tabletop) {
      var thisRouter = this;
      
      // Parse out data from sheets
      var parsed = LT.parse.eData(tabletop, this.options);
      
      // Set up collections
      this.categories = new LT.CategoriesCollection(null, this.options);
      this.bills = new LT.BillsCollection(null, this.options);
      
      // Add bill models
      _.each(parsed.bills, function(d) {
        thisRouter.bills.add(LT.utils.getModel('OSBillModel', 'bill_id', d));
      });
      
      // Add category models
      _.each(parsed.categories, function(c) {
        thisRouter.categories.add(LT.utils.getModel('CategoryModel', 'id', c));
      });
      
      // Load up bill count
      if (this.options.billCountDataSource) {
        $.jsonp({
          url: this.options.billCountDataSource,
          success: this.loadBillCounts
        });
      }
      else {
        // Start application/routing
        this.start();
      }
    },
    
    // Function to call when bill data is loaded
    loadBillCounts: function(billCountData) {
      this.categories.each(function(c) {
        var cats = c.get('legislator_subjects');
        var billCount = 0;
        
        if (_.isArray(cats) && cats.length > 0) {
          _.each(cats, function(cat) {
            var catData = _.find(billCountData, function(b) { return b.topic === cat; });
            billCount += catData.bill_count;
          });
          
          c.set('total_bill_count', billCount);
        }
      });
      
      // Start application/routing
      this.start();
    },
    
    // Start application (after data has been loaded)
    start: function() {
      // Start handling routing and history
      Backbone.history.start();
    },
  
    // Default route
    defaultR: function() {
      this.navigate('/categories', { trigger: true, replace: true });
      this.mainView.render();
    },
  
    // Categories view
    categories: function() {
      this.mainView.renderCategories();
    },
  
    // Single Category view
    category: function(category) {
      var thisRouter = this;
      
      category = decodeURI(category);
      category = this.categories.get(category);
      
      // Load up bill data from open states
      this.mainView.loading();
      category.loadBills(function() {
        thisRouter.mainView.renderCategory(category);
      }, thisRouter.error());
    },
    
    // Bill route
    bill: function(bill) {
      var thisRouter = this;
      
      bill = decodeURI(bill);
      bill = this.bills.where({ bill_id: bill })[0];
      this.mainView.loading();
      
      $.when(LT.utils.fetchModel(bill)).then(function() {
        thisRouter.mainView.renderBill(bill);
      }, this.error);
    },
    
    error: function(e) {
      // Handle error

    }
  });
  
})(jQuery, window);