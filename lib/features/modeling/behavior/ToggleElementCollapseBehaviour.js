'use strict';

var inherits = require('inherits');

var CommandInterceptor = require('diagram-js/lib/command/CommandInterceptor'),
    ModelUtil = require('../../../util/ModelUtil'),
    getBusinessObject = ModelUtil.getBusinessObject,
    computeChildrenBBox = require('diagram-js/lib/features/resize/ResizeUtil').computeChildrenBBox;



function ToggleElementCollapseBehaviour(eventBus, elementFactory, modeling, resize) {
  CommandInterceptor.call(this, eventBus);
  this.elementFactory = elementFactory;
  this.modeling = modeling;

  function hideEmptyLables(children) {
    if (children.length) {
      children.forEach(function(child) {
        if (child.type === 'label' && !child.businessObject.name) {
          child.hidden = true;
        }
      });
    }
  }

  function resizeExpanded(shape, self) {
    var children = shape.children;
    var newBounds = self.elementFactory._getDefaultSize(shape);
    var visibleElements = [shape];
    var shapeChildrenBounds = null;

    children.forEach(function(child) {
      if (!child.hidden) {
        visibleElements.push(child);
      }
    });

    shapeChildrenBounds = computeChildrenBBox(visibleElements);

    if (shapeChildrenBounds) {
      // center to childrenBounds with max(defaultSize, childrenBounds)
      newBounds.width = Math.max(shapeChildrenBounds.width, newBounds.width);
      newBounds.height = Math.max(shapeChildrenBounds.height, newBounds.height);

      newBounds.x = shapeChildrenBounds.x + (shapeChildrenBounds.width - newBounds.width) / 2;
      newBounds.y = shapeChildrenBounds.y + (shapeChildrenBounds.height - newBounds.height) / 2;
    } else {
      // center to collapsed shape with defaultSize
      newBounds.x = shape.x + (shape.width - newBounds.width) / 2;
      newBounds.y = shape.y + (shape.height - newBounds.height) / 2;
    }
    self.modeling.resizeShape(shape, newBounds);
  }

  function resizeCollapsed(shape, self) {

    var defaultSize = self.elementFactory._getDefaultSize(shape);

    var newBounds = {
      x: shape.x + (shape.width - defaultSize.width) / 2,
      y: shape.y + (shape.height - defaultSize.height) / 2,
      width: defaultSize.width,
      height: defaultSize.height
    };

    self.modeling.resizeShape(shape, newBounds);
  }

  this.executed( [ 'shape.toggleCollapse' ], 500, function(e) {

    var context = e.context;
    var shape = context.shape;

    if (!shape.collapsed) {
      // all children got made visible through djs, hide empty labels
      hideEmptyLables(shape.children);

      // remove collapsed marker
      getBusinessObject(shape).di.isExpanded = true;
    }
    else {
      // place collapsed marker
      getBusinessObject(shape).di.isExpanded = false;
    }


  });

  this.reverted( ['shape.toggleCollapse'], 500, function(e) {

    var context = e.context;
    var shape = context.shape;

    // revert removing/placing collapbsed marker
    if (!shape.collapsed) {
      getBusinessObject(shape).di.isExpanded = true;
    }
    else {
      getBusinessObject(shape).di.isExpanded = false;
    }

  });

  this.postExecuted( ['shape.toggleCollapse'], 500, function(e) {
    var shape = e.context.shape;

    if (!shape.collapsed) {
      // resize to bounds of max(visible children, defaultBounds)
      resizeExpanded(shape, this);
    }
    else {
      // resize to default bounds of collapsed shapes
      resizeCollapsed(shape, this);
    }

  }, this);
}


inherits(ToggleElementCollapseBehaviour, CommandInterceptor);

ToggleElementCollapseBehaviour.$inject = [ 'eventBus', 'elementFactory', 'modeling'];

module.exports = ToggleElementCollapseBehaviour;
