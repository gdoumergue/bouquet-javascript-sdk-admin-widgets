(function (root, factory) {
    root.squid_api.view.DomainSelectorButton = factory(root.Backbone, root.squid_api, squid_api.template.squid_api_button_view);

}(this, function (Backbone, squid_api, template) {

    var View = squid_api.view.DomainCollectionManagementWidget.extend({
        
        template : template,
        
        render : squid_api.view.CollectionSelectorUtils.renderButton

    });
    return View;
}));
