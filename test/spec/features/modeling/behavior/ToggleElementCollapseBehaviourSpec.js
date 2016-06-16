'use strict';

require('../../../../TestHelper');

/* global bootstrapModeler, inject */

var modelingModule = require('../../../../../lib/features/modeling'),
    coreModule = require('../../../../../lib/core');

var is = require('../../../../../lib/util/ModelUtil').is;

var testModules = [
  modelingModule,
  coreModule
];

describe('features/modeling - collapse and expand elements', function() {

  var diagramXML = require('../../../../fixtures/bpmn/import/collapsed/processWithChildren.bpmn');

  beforeEach(bootstrapModeler(diagramXML, {
    modules: testModules
  }));


  describe('expand', function() {

    var defaultSize = {
      width: 350,
      height: 200
    };


    it('properties are set correctly',
      inject(function(elementRegistry, bpmnReplace) {

        // given
        var collapsedSubProcess = elementRegistry.get('SubProcess_1');

        // when
        var expandedSubProcess = bpmnReplace.replaceElement(collapsedSubProcess,
          {
            type: 'bpmn:SubProcess',
            isExpanded: true
          }
        );

        // then properties are set
        expect(expandedSubProcess.collapsed).to.eql(false);
        expect(expandedSubProcess.isExpanded).to.eql(true);

        var businessObject = expandedSubProcess.businessObject;
        // verifys +-marker is removed
        expect(businessObject.di.isExpanded).to.eql(true);
      })
    );


    it('show all children, but hide empty labels',
      inject(function(elementRegistry, bpmnReplace) {

        // given
        var collapsedSubProcess = elementRegistry.get('SubProcess_1');
        var originalChildren = collapsedSubProcess.children.slice();

        // when
        var expandedSubProcess = bpmnReplace.replaceElement(collapsedSubProcess,
          {
            type: 'bpmn:SubProcess',
            isExpanded: true
          }
        );

        // then
        originalChildren.forEach(function(c) {
          expect(expandedSubProcess.children).to.include(c);
        });
        expect(expandedSubProcess.children).to.satisfy(allShown());
      })
    );


    it('keep ad-hoc and multiInstance-marker',
      inject(function(elementRegistry, bpmnReplace) {

        // given
        var collapsedSubProcess = elementRegistry.get('SubProcess_4');

        // when
        var expandedSubProcess = bpmnReplace.replaceElement(collapsedSubProcess,
          {
            type: 'bpmn:SubProcess',
            isExpanded: true
          }
        );

        // then
        expect(is(expandedSubProcess, 'bpmn:AdHocSubProcess')).to.eql(true);
        var businessObject = expandedSubProcess.businessObject;
        expect(businessObject.loopCharacteristics).to.not.be.undefined;
      })
    );


    describe('resizing', function() {


      it('ignors hidden children',
        inject(function(elementRegistry, bpmnReplace, eventBus) {

          // given
          var collapsedSubProcess = elementRegistry.get('SubProcess_5');
          var hiddenStartEvent = elementRegistry.get('StartEvent_6');
          eventBus.once('commandStack.shape.toggleCollapse.postExecute', function(e) {
            hiddenStartEvent.hidden = true;
          });

          // when
          var expandedSubProcess = bpmnReplace.replaceElement(collapsedSubProcess,
            {
              type: 'bpmn:SubProcess',
              isExpanded: true
            }
          );

          // then
          expect(expandedSubProcess.x).to.be.greaterThan(hiddenStartEvent.x);
          expect(expandedSubProcess.y).to.be.greaterThan(hiddenStartEvent.y);

        })
      );


      it('without children is centered and has defaultBounds',
        inject(function(elementRegistry, bpmnReplace) {

          // given collapsed SubProcess without children
          var collapsedSubProcess = elementRegistry.get('SubProcess_3');

          var oldMid = {
            x: collapsedSubProcess.x + collapsedSubProcess.width / 2,
            y: collapsedSubProcess.y + collapsedSubProcess.height / 2
          };

          // when
          var expandedSubProcess = bpmnReplace.replaceElement(collapsedSubProcess,
            {
              type: 'bpmn:SubProcess',
              isExpanded: true
            }
          );

          // then
          var newMid =  {
            x: expandedSubProcess.x + expandedSubProcess.width / 2,
            y: expandedSubProcess.y + expandedSubProcess.height / 2
          };

          expect(newMid).to.eql(oldMid);
          expect(expandedSubProcess.width).to.be.at.least(defaultSize.width);
          expect(expandedSubProcess.height).to.be.at.least(defaultSize.height);
        })
      );


      it('with children is centered to childrenBoundingBox and has at least defaultBounds',
        inject(function(elementRegistry, bpmnReplace) {

          // given
          var collapsedSubProcess = elementRegistry.get('SubProcess_4');

          // when
          var expandedSubProcess = bpmnReplace.replaceElement(collapsedSubProcess,
            {
              type: 'bpmn:SubProcess',
              isExpanded: true
            }
          );

          // then
          var startEvent = elementRegistry.get('StartEvent_5');
          var midChildren = {
            x: startEvent.x + startEvent.width / 2,
            y: startEvent.y + startEvent.height / 2
          };

          var expandedMid = {
            x: expandedSubProcess.x + expandedSubProcess.width / 2,
            y: expandedSubProcess.y + expandedSubProcess.height / 2
          };

          expect(expandedMid).to.eql(midChildren),
          expect(expandedSubProcess.width).to.be.at.least(defaultSize.width);
          expect(expandedSubProcess.height).to.be.at.least(defaultSize.height);
        })
      );

    });


    describe('undo', function() {


      it('properties are reverted correctly',
        inject(function(elementRegistry, bpmnReplace, commandStack) {

          // given
          var collapsedSubProcess = elementRegistry.get('SubProcess_1');
          var expandedSubProcess = bpmnReplace.replaceElement(collapsedSubProcess,
            {
              type: 'bpmn:SubProcess',
              isExpanded: true
            }
          );

          // when
          commandStack.undo();

          // then ref remains
          expect(expandedSubProcess).to.eql(collapsedSubProcess);

          // and properties are set
          expect(expandedSubProcess.collapsed).to.eql(true);
          expect(expandedSubProcess.isExpanded).to.eql(false);

          var businessObject = expandedSubProcess.businessObject;
          // verifys +-marker is placed
          expect(businessObject.di.isExpanded).to.eql(false);
        })
      );


      it('hide children and restore previous size',
        inject(function(elementRegistry, bpmnReplace, commandStack) {

          // given
          var collapsedSubProcess = elementRegistry.get('SubProcess_1');
          var originalChildren = collapsedSubProcess.children.slice();
          var originalBounds = {
            x: collapsedSubProcess.x,
            y: collapsedSubProcess.y,
            width: collapsedSubProcess.width,
            height: collapsedSubProcess.height
          };

          var expandedSubProcess = bpmnReplace.replaceElement(collapsedSubProcess,
            {
              type: 'bpmn:SubProcess',
              isExpanded: true
            }
          );

          // when
          commandStack.undo();

          // then same ref and keep children
          expect(expandedSubProcess).to.eql(collapsedSubProcess);
          originalChildren.forEach(function(c) {
            expect(collapsedSubProcess.children).to.include(c);
          });
          // and children hidden and same bounds
          expect(collapsedSubProcess.children).to.satisfy(allHidden());
          expect(collapsedSubProcess).to.have.bounds(originalBounds);
        })
      );

    });

  });


  describe('collapse', function() {

    var defaultSize = {
      width: 100,
      height: 80
    };


    it('properties are set correctly',
      inject(function(elementRegistry, bpmnReplace) {

        // given
        var expandedSubProcess = elementRegistry.get('SubProcess_2');

        // when
        var collapsedSubProcess = bpmnReplace.replaceElement(expandedSubProcess,
          {
            type: 'bpmn:SubProcess',
            isExpanded: false
          }
        );

        // then properties are set
        expect(collapsedSubProcess.collapsed).to.eql(true);
        expect(collapsedSubProcess.isExpanded).to.eql(false);

        var businessObject = collapsedSubProcess.businessObject;
        // verifys +-marker is set
        expect(businessObject.di.isExpanded).to.eql(false);
      })
    );


    it('hide all children',
     inject(function(elementRegistry, bpmnReplace) {

       // given
       var expandedSubProcess = elementRegistry.get('SubProcess_2');
       var originalChildren = expandedSubProcess.children.slice();

       // when
       var collapsedSubProcess = bpmnReplace.replaceElement(expandedSubProcess,
         {
           type: 'bpmn:SubProcess',
           isExpanded: false
         }
       );

       // then
       expect(collapsedSubProcess).to.eql(expandedSubProcess);
       originalChildren.forEach(function(c) {
         expect(collapsedSubProcess.children).to.include(c);
       });
       expect(collapsedSubProcess.children).to.satisfy(allHidden());
     })
    );


    it('keep ad-hoc and multiInstance-marker',
      inject(function(elementRegistry, bpmnReplace) {

        // given
        var expandedSubProcess = elementRegistry.get('SubProcess_2');

        // when
        var collapsedSubProcess = bpmnReplace.replaceElement(expandedSubProcess,
          {
            type: 'bpmn:SubProcess',
            isExpanded: false
          }
        );

        // then
        expect(is(collapsedSubProcess, 'bpmn:AdHocSubProcess')).to.eql(true);
        var businessObject = collapsedSubProcess.businessObject;
        expect(businessObject.loopCharacteristics).to.not.be.undefined;
      })
    );


    describe('resize', function() {


      it('is centered and has default bounds',
        inject(function(elementRegistry, bpmnReplace) {

          // given
          var expandedSubProcess = elementRegistry.get('SubProcess_2');
          var oldMid = {
            x: expandedSubProcess.x + expandedSubProcess.width / 2,
            y: expandedSubProcess.y + expandedSubProcess.height / 2
          };

          // when
          var collapsedSubProcess = bpmnReplace.replaceElement(expandedSubProcess,
            {
              type: 'bpmn:SubProcess',
              isExpanded: false
            }
          );

          // then
          var newMid = {
            x: collapsedSubProcess.x + collapsedSubProcess.width / 2,
            y: collapsedSubProcess.y + collapsedSubProcess.height / 2
          };

          expect(newMid).to.eql(oldMid);
          expect(collapsedSubProcess.width).to.be.at.least(defaultSize.width);
          expect(collapsedSubProcess.height).to.be.at.least(defaultSize.height);

        })
       );

    });


    describe('undo', function() {


      it('properties are reverted correctly',
        inject(function(elementRegistry, bpmnReplace, commandStack) {

          // given
          var expandedSubProcess = elementRegistry.get('SubProcess_2');
          var collapsedSubProcess = bpmnReplace.replaceElement(expandedSubProcess,
            {
              type: 'bpmn:SubProcess',
              isExpanded: false
            }
          );

          // when
          commandStack.undo();

          // then ref remains
          expect(collapsedSubProcess).to.eql(expandedSubProcess);

          // and properties are set
          expect(collapsedSubProcess.collapsed).to.eql(false);
          expect(collapsedSubProcess.isExpanded).to.eql(true);

          var businessObject = collapsedSubProcess.businessObject;
          // verifys +-marker is placed
          expect(businessObject.di.isExpanded).to.eql(true);
        })
      );


      it('show children that were visible',
        inject(function(elementRegistry, bpmnReplace, commandStack) {

          // given
          var expandedSubProcess = elementRegistry.get('SubProcess_2');
          var originalChildren = expandedSubProcess.children.slice();
          var originalBounds = {
            x: expandedSubProcess.x,
            y: expandedSubProcess.y,
            width: expandedSubProcess.width,
            height: expandedSubProcess.height
          };

          var collapsedSubProcess = bpmnReplace.replaceElement(expandedSubProcess,
            {
              type: 'bpmn:SubProcess',
              isExpanded: false
            }
          );

          // when
          commandStack.undo();

          // then same ref and keep children
          expect(expandedSubProcess).to.eql(collapsedSubProcess);
          originalChildren.forEach(function(c) {
            expect(expandedSubProcess.children).to.include(c);
          });

          // children hidden and same bounds
          expect(expandedSubProcess.children).to.satisfy(allShown());
          expect(expandedSubProcess).to.have.bounds(originalBounds);
        })
      );

    });
  });

  describe('attaching marker', function() {


    describe('collapse', function() {


      it('add ad-hoc-marker does not call toggleProvider',
        inject(function(eventBus, bpmnReplace, elementRegistry) {

          // given
          var collapsedSubProcess = elementRegistry.get('SubProcess_3');

          // should not be called
          eventBus.once('commandStack.shape.toggleCollapse.execute', function(e) {
            expect(true).to.eql(false);
          });

          // when
          bpmnReplace.replaceElement(collapsedSubProcess,
            {
              type: 'bpmn:AdHocSubProcess',
              isExpanded: false
            }
          );

          // then

        })
      );


      it('remove ad-hoc-marker does not call toggleProvider',
        inject(function(eventBus, bpmnReplace, elementRegistry) {

          // given
          var collapsedSubProcess = elementRegistry.get('SubProcess_4');

          // should not be called
          eventBus.once('commandStack.shape.toggleCollapse.execute', function(e) {
            expect(true).to.eql(false);
          });

          // when
          bpmnReplace.replaceElement(collapsedSubProcess,
            {
              type: 'bpmn:SubProcess',
              isExpanded: false
            }
          );

          // then

        })
      );

    });


    describe('expand', function() {


      it('add ad-hoc-marker does not call toggleProvider',
        inject(function(eventBus, bpmnReplace, elementRegistry) {

          // given
          var collapsedSubProcess = elementRegistry.get('SubProcess_6');

          // should not be called
          eventBus.once('commandStack.shape.toggleCollapse.execute', function(e) {
            expect(true).to.eql(false);
          });

          // when
          bpmnReplace.replaceElement(collapsedSubProcess,
            {
              type: 'bpmn:AdHocSubProcess',
              isExpanded: true
            }
          );

          // then

        })
      );


      it('remove ad-hoc-marker does not call toggleProvider',
        inject(function(eventBus, bpmnReplace, elementRegistry) {

          // given
          var collapsedSubProcess = elementRegistry.get('SubProcess_2');

          // should not be called
          eventBus.once('commandStack.shape.toggleCollapse.execute', function(e) {
            expect(true).to.eql(false);
          });

          // when
          bpmnReplace.replaceElement(collapsedSubProcess,
            {
              type: 'bpmn:SubProcess',
              isExpanded: true
            }
          );

          // then

        })
      );

    });



  });


});


/////////// helpers /////////////////////////////


function allHidden() {
  return childrenHidden(true);
}

function allShown() {
  return childrenHidden(false);
}

function childrenHidden(hidden) {
  return function(children) {
    return children.every(function(child) {
      // empty labels are allways hidden
      if (child.type === 'label' && !child.businessObject.name) {
        return child.hidden;
      }
      else {
        return child.hidden == hidden;
      }
    });
  };
}
