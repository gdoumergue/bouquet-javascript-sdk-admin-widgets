(function (root, factory) {
    root.squid_api.view.ModelManagementView = factory(root.Backbone, root.squid_api, squid_api.template.squid_api_model_management_widget);

}(this, function (Backbone, squid_api, template) {

    var View = Backbone.View.extend({

        successHandler: null,
        errorHandler: null,
        modalElementClassName : "squid-api-admin-widgets-modal-form",
        buttonLabel : null,
        autoOpen: null,
        parent: null,
        suggestionHandler : null,
        schemasCallback : null,
        beforeRenderHandler : null,
        modalTitle : null,

        initialize: function(options) {
            var me = this;

            // setup options
            if (options.template) {
                this.template = options.template;
            } else {
                this.template = template;
            }
            if (options.successHandler) {
                this.successHandler = options.successHandler;
            }
            if (options.errorHandler) {
                this.errorHandler = options.errorHandler;
            }
            if (options.buttonLabel) {
                this.buttonLabel = options.buttonLabel;
            }
            if (options.autoOpen) {
                this.autoOpen = options.autoOpen;
            }
            if (options.parent) {
                this.parent = options.parent;
            }
            if (options.suggestionHandler) {
                this.suggestionHandler = options.suggestionHandler;
            }
            if (options.schemasCallback) {
                this.schemasCallback = options.schemasCallback;
            }
            if (options.beforeRenderHandler) {
                this.beforeRenderHandler = options.beforeRenderHandler;
            }
            if (options.modalTitle) {
                this.modalTitle = options.modalTitle;
            }
            if (options.createOnlyView) {
                this.createOnlyView = options.createOnlyView;
            }

            // Set Form Schema
            this.setSchema();

            if (this.model) {
                this.listenTo(this.model, 'change', this.setSchema);
            }

            if (this.autoOpen) {
                this.prepareForm();
            }
        },

        manipulateData : function(data) {
            // set empty values to null
            var fields = data;
            for (var value in fields) {
                if (fields[value].length === 0) {
                    data[value] = null;
                }
            }

            // if the definition isn't project, add the projectId
            data.id = {};
            if (squid_api.model.project.get("id")) {
                var projectId = squid_api.model.project.get("id").projectId;
                if (this.model.definition !== "Project") {
                    data.id.projectId = projectId;
                    if (data.id[this.model.definition + "Id"]) {
                        data.id[this.model.definition + "Id"] = data[id];
                    } else {
                        data.id[this.model.definition + "Id"] = null;
                    }
                }
            }

            return data;
        },

        setStatusMessage: function(message) {
            setTimeout(function() {
                squid_api.model.status.set({'message' : message});
            }, 1000);
        },

        saveForm : function(formContent) {
            var me = this;
            var invalidExpression = this.formContent.$el.find(".invalid-expression").length > 0;

            /*
                1. validate form (if errors, display them & keep modal open)
                2. save data
            */

            var validForm = this.formContent.validate();
            if (validForm) {
                me.formModal.preventClose();
            } else if (! invalidExpression) {
                // remove all dialog's
                $(".squid-api-dialog").remove();

                if (this.model.definition == "Project" && me.schema.dbSchemas.options.length === 0) {
                    me.formModal.preventClose();
                }

                var data = me.manipulateData(this.formContent.getValue());
                me.model.save(data, {
                    success: function (collection, response) {
                        // project exception
                        if (me.model.definition == "Project") {
                            me.schema.id.type = "Hidden";
                            if (me.schemasCallback) {
                                me.schemasCallback.call(me);
                            }
                            if (me.successHandler) {
                                me.successHandler.call(collection);
                            }
                        } else {
                            if (me.successHandler) {
                                me.successHandler.call(collection);
                            }
                        }
                    },
                    error: function (collection, response) {
                        var msg = response.objectType + " error saving with name " + response.name;
                        me.setStatusMessage(msg);

                        if (me.errorHandler) {
                            me.errorHandler.call(collection);
                        }
                    }
                });
            } else {
                me.formModal.preventClose();
            }
        },
        resetStatusMessage : function() {
            this.setStatusMessage("");
        },
        renderForm : function() {
            // called when we want to set the model / schema & render the form via a modal
            var me = this;

            // set base schema & modal into form
            this.formContent = new Backbone.Form({
                schema: me.schema,
                model: me.model
            }).render();

            // render the form into a backbone view
            this.formView = Backbone.View.extend({
                model: me.model,
                parent: me.parent,
                // domain subject exception
                events: {
                    "keyup .domain-subject" : function(e) {
                        me.suggestionHandler.call(me);
                    },
                    "click .domain-subject" : function(e) {
                        me.suggestionHandler.call(me);
                    }
                },
                render: function() {
                    this.$el.html(me.formContent.el);
                    return this;
                }
            });

            // modal title
            var modalTitle;
            if (this.modalTitle) {

            } else {
                if (me.model.get("id")) {
                    modalTitle = "Editing " + me.model.definition + ": " + me.model.get("name");
                } else {
                    modalTitle = "Creating a new " + me.model.definition;
                }
            }

            // instantiate a new modal view, set the content & automatically open
            this.formModal = new Backbone.BootstrapModal({
                content: new this.formView(),
                animate: true,
                title: modalTitle
            }).open();

            // modal wrapper class
            $(this.formModal.el).addClass(this.modalElementClassName);

            // modal definition class
            $(this.formModal.el).find(".modal-dialog").addClass(me.model.definition);

            // saveForm on 'ok' click
            this.formModal.on('ok', function() {
                me.saveForm();
            });
            // on cancel
            this.formModal.on('cancel', function() {
                $(".squid-api-dialog").remove();
                me.resetStatusMessage();
            });
        },

        prepareForm: function() {
            // obtain schema values if project
            if (this.schemasCallback) {
                this.schemasCallback.call(this);
            }
            if (this.beforeRenderHandler) {
                this.beforeRenderHandler.call(this);
            }
            this.renderForm();
        },

        events: {
            "click button" : function() {
                // reset model defaults
                this.model.clear().set(this.model.defaults);

                this.prepareForm();
            }
        },

        getPropertyType: function(type) {
            switch(type) {
                case "string":
                    return "Text";
                case "int32":
                    return "Number";
                case "array":
                    return "Checkboxes";
                default:
                    return "Text";
            }
        },

        remove: function() {
            this.undelegateEvents();
            this.$el.empty();
            this.stopListening();
            return this;
        },

        setSchema: function(property) {
            var me = this;

            if (this.formContent) {
                this.formContent.model = me.model;
            }

            squid_api.getSchema().done(function(data) {

                // base variables
                var definition = data.definitions[me.model.definition];
                var properties = definition.properties;
                schema = modelData = {};

                // delete ignored properties from schema
                if (me.model.ignoredAttributes) {
                    var obj = {};
                    for (var ix in properties) {
                        for (i=0; i<me.model.ignoredAttributes.length; i++) {
                            if (me.model.ignoredAttributes[i] == ix) {
                                delete properties[ix];
                            }
                        }
                    }
                }

                // create schema
                for (var property in properties) {
                    if (! properties[property].readOnly) {
                        // base field object
                        schema[property] = {};
                        var refValue, ref, subProp, nm;

                        // obtain reference property values
                        if (properties[property].items) {
                            if (properties[property].items.$ref) {
                                subProp = data.definitions[properties[property].items.$ref.substr(properties[property].items.$ref.lastIndexOf("/") + 1)].properties;
                            }
                        }

                        if (properties[property].$ref) {
                            if (me.model.definition == "Domain" && property == "subject") {
                                refValue = properties.subject.$ref;
                                ref = properties.subject.$ref.substr(refValue.lastIndexOf("/") + 1);
                                subProp = data.definitions[ref].properties;

                                schema[property].type = "Object";
                                schema[property].subSchema = subProp;
                                schema[property].subSchema[Object.keys(subProp)[0]].type = "TextArea";
                                schema[property].subSchema[Object.keys(subProp)[0]].editorClass = "form-control domain-subject";
                            } else {
                                // base nested model
                                nm = {};
                                subProp = data.definitions[properties[property].$ref.substr(properties[property].$ref.lastIndexOf("/") + 1)].properties;
                                for (var subProperty1 in subProp) {
                                    nm[subProperty1] = {};
                                    if (subProp[subProperty1].enum) {
                                        nm[subProperty1].type = "Text";
                                        nm[subProperty1].options = subProp[subProperty].enum;
                                    } else {
                                        nm[subProperty1].options = [];
                                        nm[subProperty1].type = me.getPropertyType(subProp[subProperty1].type);
                                    }
                                    nm[subProperty1].editorClass = "form-control";
                                }

                                schema[property].type = "Object";
                                schema[property].subSchema = nm;
                            }
                        }

                        if (properties[property].items && properties[property].items.$ref) {
                            // base nested model
                            nm = {};

                            // apply sub-properties (if exist)
                            for (var subProperty in subProp) {
                                nm[subProperty] = {};
                                if (subProp[subProperty].enum) {
                                    nm[subProperty].type = "Text";
                                    nm[subProperty].options = subProp[subProperty].enum;
                                } else {
                                    nm[subProperty].options = [];
                                    nm[subProperty].type = me.getPropertyType(subProp[subProperty].type);
                                }
                                nm[subProperty].editorClass = "form-control";
                                nm[subProperty].disabled = true;
                            }

                            schema[property].type = "List";
                            schema[property].itemType = "Object";
                            schema[property].subSchema = nm;
                        } else if (! properties[property].$ref) {
                            // domain exception
                            if (schema[property].type !== "Checkboxes") {
                                if (property.includes("Password")) {
                                    schema[property].type = "Password";
                                } else {
                                    type = me.getPropertyType(properties[property].type);
                                    schema[property].type = type;
                                }
                                schema[property].editorClass = "form-control";
                            }
                            if (schema[property].type == "Checkboxes") {
                                schema[property].editorClass = " ";
                                if (me.model.get(property)) {
                                    schema[property].options = me.model.get(property);
                                } else {
                                    schema[property].options = [];
                                }
                            }
                        }
                        // positions
                        if (properties[property].position) {
                            schema[property].position = properties[property].position;
                        }
                    }
                }

                // validation
                var required;
                if (data.definitions[me.model.definition]) {
                    required = data.definitions[me.model.definition].required;
                }
                if (required) {
                    for (i=0; i<required.length; i++) {
                        schema[required[i]].validators = ['required'];
                    }
                }

                // set schema
                me.schema = schema;

                // if schema already set, hide id
                me.schema.id.type = "Hidden";

                // Render View
                me.render();
            });
        },

        render: function(currentView) {
            var me = this;

            var jsonData = {
                "view" : "squid-api-admin-widgets-" + me.model.definition,
                "definition" : me.model.definition,
                "buttonLabel" : me.buttonLabel
            };

            // Print Button to trigger management widget
            if (! this.autoOpen) {
                this.$el.html(this.template(jsonData));
            }
        }
    });

    return View;
}));
