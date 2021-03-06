// Copyright 2014 Rackspace
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

HotUI.Panel = {};

HotUI.Panel.Base = HotUI.UI.Base.extend({
    create: function () {
        return HotUI.UI.Base.create.call(this);
    },
    html: function () {
        return HotUI.UI.Base.html.call(this).addClass('hb_panel');
    }
});

HotUI.Panel.Home = HotUI.Panel.Base.extend({
    create: function (templates, onResourceDropCB) {
        var self = HotUI.Panel.Base.create.call(this);
        self._onResourceDrop = onResourceDropCB;
        self._templates = templates;
        return self;
    },
    _setupDrag: function () {
        var self = this,
            $overlay = $("#hotui_overlay"),
            $replacement;

        function onDragStart() {
            var $target = $(this),
                targetOffset = $target.offset(),
                overlayOffset = $overlay.offset(),
                targetLeft = targetOffset.left - overlayOffset.left,
                targetTop = targetOffset.top - overlayOffset.top,
                posDoc = d3.mouse($('body')[0]),
                pos = d3.mouse($overlay[0]);

            $replacement = $target.clone();

            d3.select($replacement[0]).call(self._drag); // Attach handler

            $replacement.addClass('replacement')
                .css('opacity', '0')
                .insertAfter($target);

            $target
                .addClass('hb_dragging')
                .width($target.width()) // Prevent auto-resizing on drag
                .appendTo($overlay)
                .css({
                    left: targetLeft,
                    position: 'absolute',
                    top: targetTop
                })
                .attr({
                    dragStartX: posDoc[0],
                    dragStartY: posDoc[1]
                });
        }

        function onDrag() {
            var $target = $(this),
                pos = d3.mouse($overlay[0]);

            $target.css({
                'left': pos[0] - 15,
                'top': pos[1] - 15
            });
        }

        function onDragEnd() {
            var $target = $(this),
                posDoc = d3.mouse($('body')[0]);

            function outsideSidePanel() {
                var pos = d3.mouse(self._$container[0]);
                return pos[0] < 0 || pos[0] > self._$container.width() ||
                       pos[1] < 0 || pos[1] > self._$container.height();
            }

            function didNotMove() {
                return posDoc[0] === +$target.attr('dragStartX') &&
                       posDoc[1] === +$target.attr('dragStartY');
            }

            $replacement.animate({ opacity: 1 }, 500)
                        .removeClass('replacement');

            $overlay.children('.resource_draggable').remove();

            if (outsideSidePanel()) {
                self._onResourceDrop(posDoc[0], posDoc[1],
                                     $target.attr('type'));
            }
        }

        this._drag = d3.behavior.drag()
                                .on("dragstart", onDragStart)
                                .on("drag", onDrag)
                                .on("dragend", onDragEnd);
    },
    _buildAddResource: function () {
        var html = "",
            resListHTML = '',
            resMap,
            resMapKeys,
            commonResources = HOTUI_COMMON_RESOURCES,
            keyOrder = ['Rackspace', 'OS'],
            $accordion,
            $commonResources,
            $providerResources,
            $search = $('<input class="hb_search_resources" type="text" ' +
                        'placeholder="Search Resources...">'),
            $html = $('<div class="hb_add_resource"></div>');

        function safePush(obj, key, val) {
            obj[key] = obj[key] || [];
            obj[key].push(val);
        }

        function getSection(resourceType, sectionNum) {
            return resourceType.split('::')[sectionNum];
        }

        function mapSectionFactory(sectionNum) {
            return function (objOut, resType) {
                safePush(objOut, getSection(resType, sectionNum), resType);
                return objOut;
            };
        }

        function getDraggableHTML(resType, label) {
            return Snippy(
                '<div class="resource_draggable" type="${type}">' +
                '<div></div>${label}</div>')({
                    type: resType,
                    label: label || getSection(resType, 2)
            });

        }

        $search.on('change keyup input paste', function () {
            var val = $search.val().toLowerCase();
            $accordion.closeSection(0);
            $accordion.openSection(1);

            function filterResources($el) {
                var hasVisibleResource = false;
                $el.find('.resource_draggable').each(function () {
                    var self = $(this);
                    if (self.attr('type').toLowerCase().indexOf(val) > -1) {
                        hasVisibleResource = true;
                        self.show();
                    } else {
                        self.hide();
                    }
                });

                return hasVisibleResource;
            }

            $html.find('.hb_resource_org').each(function () {
                var $org = $(this),
                    hasVisibleResClass = false;
                $org.find('.hb_resource_class').each(function () {
                    var $resClass = $(this);
                    if (filterResources($resClass)) {
                        hasVisibleResClass = true;
                        $resClass.show();
                    } else {
                        $resClass.hide();
                    }
                });

                if (hasVisibleResClass) {
                    $org.show();
                } else {
                    $org.hide();
                }
            });
        });

        $html.append('<h2>Add Resource</h2>', $search);

        $commonResources = $(
            '<div>' +
            commonResources.map(function (res) {
                return getDraggableHTML(res.resource, res.label);
            }).join('') + '</div>');

        $html.append($commonResources);

        resMap = Object.keys(HotUI.HOT.ResourceProperties.Normal)
                       .reduce(mapSectionFactory(0), {});

        Object.keys(resMap).forEach(function (key) {
            resMap[key] = resMap[key].reduce(mapSectionFactory(1), {});
        });

        resMapKeys = keyOrder.concat(
            Object.keys(resMap).sort().filter(function (k) {
                return keyOrder.indexOf(k) === -1;
            }));

        resMapKeys.forEach(function (sec0) {
            resListHTML += '<div class="hb_resource_org">';
            resListHTML += Snippy('<h3 class="resource_org">${0}</h3>')([sec0]);

            Object.keys(resMap[sec0]).sort().forEach(function (sec1) {
                resListHTML += '<div class="hb_resource_class">';
                resListHTML += '<h4>' + sec1 + '</h4>';

                resMap[sec0][sec1].sort(function (el1, el2) {
                    return getSection(el1, 2).localeCompare(getSection(el2, 2));
                }).forEach(function (resType) {
                    resListHTML += getDraggableHTML(resType);
                });

                resListHTML += '</div>';
            });

            resListHTML += '</div>';
        });

        $providerResources = $(
            '<div>' +
            Object.keys(HotUI.HOT.ResourceProperties.Custom).map(
                function (name) {
                    return getDraggableHTML(name, name.split('/').pop());
                }).join('') + '</div>');

        $accordion = HotUI.UI.Accordion.create([{
            label: 'Common Resources',
            element: HotUI.UI.Base.extend({
                _doHTML: function () {
                    return $commonResources;
                }
            }).create()
        }, {
            label: 'All Resources',
            element: HotUI.UI.Base.extend({
                _doHTML: function () {
                    return $('<div class="hb_more_resources">' +
                             resListHTML +
                             '</div>');
                }
            }).create()
        }, {
            label: 'Provider Resources',
            element: HotUI.UI.Base.extend({
                _doHTML: function () {
                    return $providerResources;
                }
            }).create()
        }]);

        $html.append($accordion.html(this));
        $accordion.clickLabel(0);

        d3.select($html[0]).selectAll(".resource_draggable")
            .call(this._drag);

        return $html;
    },
    _buildRefArch: function () {
        var self = this,
            $html = $('<div class="hb_ref_arch"></div>');

        $html.append('<h2>Pre-built Configurations</h2>');

        HOTUI_PREBUILT_CONFIGURATIONS.forEach(function (config) {
            var $config = $(Snippy('<div class="hb_prebuilt_config">' +
                                   '<img src="${icon}">${name}</div>')(config)),
                $configDetail = $(Snippy(
                    '<div class="hb_prebuilt_config_detail">' +
                        '<div class="hb_detail_arrow"></div>' +
                        '${desc}' +
                    '</div>')({
                        desc: config.template.description || 'No description'
                    }));

            $config.hover(function () {
                var offset = $config.offset();
                $configDetail.css({
                    left: offset.left + parseFloat($config.css('width')),
                    top: offset.top
                }).appendTo('#hotui_overlay');
            }, function () {
                $configDetail.remove();
            }).click(function () {
                HotUI.UI.Modal.create({
                    title: 'Warning',
                    content: 'This will overwrite your current template!',
                    buttons: [
                        {
                            label: 'Overwrite',
                            cssClass: 'hb_red',
                            action: function () {
                                self._templates.set(0, config.template);
                            }
                        }, {
                            label: 'Cancel'
                        }
                    ]
                }).display();
            });

            $html.append($config);
        });

        return $html;
    },
    _doHTML: function () {
        var $html = $('<div class="hb_home hb_scroll"></div>'),
            $addResource,
            $refArch = this._buildRefArch();

        this._$container = this._$content = $html;
        this._setupDrag();
        $addResource = this._buildAddResource($html);
        $html.append($addResource, $refArch);

        return $html;
    },
});

HotUI.Panel.Template = HotUI.Panel.Base.extend({
    create: function (templates) {
        var self = HotUI.Panel.Base.create.call(this);
        self._templates = templates;
        return self;
    },
    _doHTML: function () {
        var template = this._templates.get(0),
            $accordion = HotUI.UI.Accordion.create([
                {label: 'Heat Template Version',
                 element: HotUI.UI.FormControl(
                    template.get('heat_template_version'))},
                {label: 'Description',
                 element: HotUI.UI.FormControl(template.get('description'))},
                {label: 'Parameters',
                 element: HotUI.UI.FormControl(template.get('parameters'))},
                {label: 'Resources',
                 element: HotUI.UI.FormControl(template.get('resources'),
                                               {template: template})},
                {label: 'Outputs',
                 element: HotUI.UI.FormControl(template.get('outputs'),
                                               {template: template})}
            ]);

        return $('<div class="hb_panel hb_scroll hb_template_panel"></div>')
            .append($accordion.html(this));
    }
});

HotUI.Panel.ResourceDetail = HotUI.Panel.Base.extend({
    create: function (resource, template) {
        var self = HotUI.Panel.Base.create.call(this);
        self._resource = resource;
        self._template = template;
        return self;
    },
    _doHTML: function () {
        this._$html = $('<div class="hb_scroll hb_resource_detail"></div>');
        return this._$html;
    },
    _finishHTML: function () {
        var self = this,
            resource = this._resource,
            $html = this._$html,
            backingType = resource.get('properties').getBackingType(),
            attributesHTML = this._getAttributesHTML(resource.getAttributes()),
            resourceControl = HotUI.UI.FormControl(resource, {
                'template': this._template
            }),
            $resourceID = $(Snippy(
                '<input class="resource_id" type="text" value="${0}">')([
                    resource.getID()])),
            $deleteResourceButton = $('<a class="delete_resource">Delete</a>');

        $resourceID.on('blur', function () {
            resource.setID($resourceID.val());
        });

        $deleteResourceButton.click(function () {
            var i,
                resources = self._template.get('resources');

            for (i = 0; i < resources.length(); i++) {
                if (resources.get(i).getID() === resource.getID()) {
                    resources.remove(i);
                }
            }
            $html.empty();
        });

        $html.append(
            $('<h2></h2>').append($resourceID),
            $(Snippy('<br><a href="${0}" target="_blank">Docs</a><br>')
                 ([resource.getDocsLink()])),
            $deleteResourceButton,
            '<hr>',
            'Attributes:<br>' + (attributesHTML || 'None<br>'),
            '<hr>',
            resourceControl.html(this));
    },
    _getAttributesHTML: function (attributes) {
        return attributes.sort(function (attr1, attr2) {
                return attr1.getID().localeCompare(attr2.getID());
            }).map(function (attribute) {
                return '<b>' + attribute.getID() + '</b> - ' +
                       attribute.get('description').get();
            }).join("<br>");
    },
});

HotUI.Panel.LinkCreate = HotUI.Panel.Base.extend({
    create: function (sourceResource, targetResource) {
        var self = HotUI.Panel.Base.create.call(this);
        self._sourceResource = sourceResource;
        self._targetResource = targetResource;
        self._dependencyType = ko.observable(self._dependencyTypes[0]);
        return self;
    },
    _dependencyTypes: [
        {label: 'General', value: 'depends_on'},
        {label: 'Resource', value: 'get_resource'},
        {label: 'Attribute', value: 'get_attr'}
    ],
    _doHTML: function () {
        var self = this,
            sourceResource = this._sourceResource,
            targetResource = this._targetResource,
            sourceIDHTML = '<strong>' + sourceResource.getID() + '</strong>',
            targetIDHTML = '<strong>' + targetResource.getID() + '</strong>',
            getAttribute = HotUI.HOT.GetAttribute.create(),
            value = getAttribute.get('get_attr').get('value'),
            $html = $('<div class="hb_scroll hb_link_create_panel" ' +
                           'data-bind="css: _dependencyType().value"></div>'),
            $dependencyTypeSelector =
                '<select data-bind="options: _dependencyTypes, ' +
                                   'optionsText: \'label\', ' +
                                   'value: _dependencyType"></select>',
            $sourceBox = $('<div class="hb_properties"></div>'),
            $destBox = $('<div class="hb_attributes"></div>'),
            $createButton =
                $('<div class="hb_create_dependency">Create Dependency</div>'),
            $attribute = HotUI.UI.ResAttributeSelector.create(targetResource),
            $value = HotUI.UI.SchemalessContainer.create(value),
            $selector = HotUI.UI.ResourcePropertySelector
                             .create(sourceResource);

        function clickCreateDependency() {
            var path = $selector.getSelection(),
                newDependency,
                dependencyType = self._dependencyType().value;

            function getNode(data, path) {
                if (path.length) {
                    if (data.instanceof(
                            HotUI.HOT.ResourcePropertyWrapper)) {
                        data = data.getValue();
                    }

                    if (path[0] === '*') {
                        data.push();
                        path[0] = data.length() - 1;
                    }

                    return getNode(data.get(path[0]), path.slice(1));
                } else {
                    return data;
                }
            }

            console.log(dependencyType);
            if (dependencyType === 'depends_on') {
                sourceResource.get('depends_on')
                              .push(targetResource.getID());
            } else if (dependencyType === 'get_resource') {
                newDependency = HotUI.HOT.GetResource.create()
                                    .set('get_resource', targetResource);

                getNode(sourceResource.get('properties'), path)
                    .setValue(newDependency);
            } else {
                getAttribute.get('get_attr')
                    .set('attribute', $attribute.getSelection());

                getNode(sourceResource.get('properties'), path)
                    .setValue(getAttribute);
            }
        }

        getAttribute.get('get_attr').set('resource', targetResource);

        $createButton.click(clickCreateDependency);

        $sourceBox.append(sourceIDHTML + '\'s property: <br>',
                          $selector.html(this),
                          '<br>will receive<br><br>');

        $destBox.append(targetIDHTML + '\'s attribute: <br>',
                        $attribute.html(this),
                        $value.html(this));

        $html.append('<h2>Create Dependency</h2><br>',
                     'Dependency type: ',
                     $dependencyTypeSelector,
                     '<hr>',
                     '<div class="hb_depends_on">' + sourceIDHTML +
                        ' will depend on ' + targetIDHTML + '</div>',
                     $sourceBox,
                     $destBox,
                     '<div class="hb_get_resource">' + targetIDHTML + '\'s ' +
                         'resource ID</div>',
                     '<br>',
                     $createButton);

        return $html;
    }
});
