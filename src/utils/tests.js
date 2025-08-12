export function runTulipTests(appJson) {
  const results = [];
  const steps = appJson.steps || [];
  const widgets = appJson.widgets || [];
  const triggers = appJson.triggers || [];
  const variables = appJson.variables || [];

  // Build a map from trigger ID to trigger object
  const triggersMap = new Map(triggers.map(t => [t._id, t]));
  const allTriggers = [];

  // Helper to safely get event type
  const getEventName = (trigger) => trigger?.event?.type || 'unknown';

  // Gather all triggers from steps and widgets with extra context
  steps.forEach(step => {
    const stepName = step.name || 'undefined';

    (step.triggers || []).forEach(triggerId => {
      const trigger = triggersMap.get(triggerId);
      if (trigger) {
        allTriggers.push({
          ...trigger,
          stepName,
          widgetType: 'step',
          event_name: getEventName(trigger),
        });
      }
    });

    widgets
      .filter(w => w.parent_step === step._id && w.triggers)
      .forEach(widget => {
        widget.triggers.forEach(triggerId => {
          const trigger = triggersMap.get(triggerId);
          if (trigger) {
            allTriggers.push({
              ...trigger,
              stepName,
              widgetType: widget.type || 'widget',
              widgetName: widget.name || 'Unnamed Widget',
              event_name: getEventName(trigger),
            });
          }
        });
      });
  });

  // Helper to format results with numbering
  const formatDetails = (items, formatter) =>
    items.length === 0
      ? ['No issues found.']
      : items.map((item, i) => `${i + 1}- ${formatter(item)}`);

  // Test 1: Untitled Triggers
  const untitledTriggers = allTriggers.filter(t => {
    const name = (t.description || '').trim().toLowerCase();
    return name === '' || name === 'untitled trigger';
  });
  results.push({
    name: 'Test for untitled triggers',
    status: untitledTriggers.length === 0 ? 'Pass' : 'Fail',
    details: formatDetails(
      untitledTriggers,
      t => `Found untitled trigger on step: '${t.stepName}', Location: '${t.event_name}', Widget: '${t.widgetType}'`
    ),
  });

  // Test 2: Disabled Triggers
  const disabledTriggers = allTriggers.filter(t => t.disabled === true);
  results.push({
    name: 'Test for disabled triggers',
    status: disabledTriggers.length === 0 ? 'Pass' : 'Fail',
    details: formatDetails(
      disabledTriggers,
      t => `Found disabled trigger on step: '${t.stepName}', Trigger name: '${t.description || 'unnamed'}', Location: '${t.event_name}', Widget: '${t.widgetType}'`
    ),
  });

  // Test 3: Untitled Steps
  const untitledSteps = steps.filter(
    s => !s.name || s.name.trim().toLowerCase() === 'untitled step'
  );
  results.push({
    name: 'Test for untitled steps',
    status: untitledSteps.length === 0 ? 'Pass' : 'Fail',
    details: formatDetails(
      untitledSteps,
      s => `Step name is '${s.name || 'undefined'}'`
    ),
  });

  // Test 4: Complete App + Save App in same trigger
  const conflictingTriggers = allTriggers.filter(t =>
    (t.clauses || []).some(c =>
      (c.actions || []).some(a => a.action === 'complete_app') &&
      (c.actions || []).some(a => a.action === 'save_app')
    )
  );
  results.push({
    name: 'Test for complete app and save app data in the same trigger',
    status: conflictingTriggers.length === 0 ? 'Pass' : 'Fail',
    details: formatDetails(
      conflictingTriggers,
      t => `Found both 'complete_app' and 'save_app' in trigger: '${t.description || 'unnamed'}' on step: '${t.stepName}'`
    ),
  });

  // Test 5: Complete App + Step Change
  const completeStepConflict = [];
  allTriggers.forEach(t => {
    (t.clauses || []).forEach(c => {
      const actions = c.actions || [];
      if (
        actions.some(a => a.action === 'complete_app') &&
        actions.some(a => a.action === 'go_to_step')
      ) {
        completeStepConflict.push({
          trigger: t.description || 'unnamed',
          step: t.stepName,
          widget: t.widgetType,
          location: t.event_name,
        });
      }
    });
  });
  results.push({
    name: 'Test for complete app with step change',
    status: completeStepConflict.length === 0 ? 'Pass' : 'Fail',
    details: formatDetails(
      completeStepConflict,
      c => `Found a clause with 'Complete App then Change to Step' on step: '${c.step}', Trigger name: '${c.trigger}', Location: '${c.location}', Widget: '${c.widget}'`
    ),
  });

  // Test 6: Triggers using user groups
  const userGroupTriggers = [];
  allTriggers.forEach(t => {
    (t.clauses || []).forEach(c => {
      if (JSON.stringify(c).includes('user_group')) {
        userGroupTriggers.push({
          trigger: t.description || 'unnamed',
          step: t.stepName,
          widget: t.widgetType,
          location: t.event_name,
        });
      }
    });
  });
  results.push({
    name: 'Test for broken triggers when using user groups (import/export issues)',
    status: userGroupTriggers.length === 0 ? 'Pass' : 'Fail',
    details: formatDetails(
      userGroupTriggers,
      c => `Found a trigger clause with 'user group' on step: '${c.step}', Trigger name: '${c.trigger}', Location: '${c.location}', Widget: '${c.widget}'`
    ),
  });

  // Test 7: Complete App + Go to App
  const crossAppTriggers = [];
  allTriggers.forEach(t => {
    (t.clauses || []).forEach(c => {
      const actions = c.actions || [];
      if (
        actions.some(a => a.action === 'complete_app') &&
        actions.some(a => a.action === 'go_to_app')
      ) {
        crossAppTriggers.push({
          trigger: t.description || 'unnamed',
          step: t.stepName,
          widget: t.widgetType,
          location: t.event_name,
        });
      }
    });
  });
  results.push({
    name: 'Test for broken triggers when navigating to another app (import/export issues)',
    status: crossAppTriggers.length === 0 ? 'Pass' : 'Fail',
    details: formatDetails(
      crossAppTriggers,
      c => `Found a trigger clause with 'complete_app' and 'go_to_app' on step: '${c.step}', Trigger name: '${c.trigger}', Location: '${c.location}', Widget: '${c.widget}'`
    ),
  });

  // Test 8: Broken Triggers
  const brokenTriggers = allTriggers.filter(t => t.broken === true);
  results.push({
    name: 'Test for broken triggers',
    status: brokenTriggers.length === 0 ? 'Pass' : 'Fail',
    details: formatDetails(
      brokenTriggers,
      t => `Broken trigger '${t.description || 'unnamed'}' in step: '${t.stepName}', Widget: '${t.widgetName || t.widgetType}', Location: '${t.event_name}'`
    ),
  });

  // Test 9: Broken go_to_step Actions (missing step_id)
  const brokenGoToStepTriggers = [];
  allTriggers.forEach(t => {
    (t.clauses || []).forEach(c => {
      (c.actions || []).forEach(a => {
        if (a.action === 'go_to_step' && (a.step_id == null || a.step_id === '')) {
          brokenGoToStepTriggers.push({
            trigger: t.description || 'unnamed',
            step: t.stepName,
            widget: t.widgetName || t.widgetType,
            location: t.event_name
          });
        }
      });
    });
  });
  results.push({
    name: 'Test for broken go_to_step actions',
    status: brokenGoToStepTriggers.length === 0 ? 'Pass' : 'Fail',
    details: formatDetails(
      brokenGoToStepTriggers,
      c => `Trigger '${c.trigger}' in step: '${c.step}' has broken 'go_to_step' action (missing or invalid step_id), Widget: '${c.widget}', Location: '${c.location}'`
    ),
  });

  // Test 10: Unused Variables
  const appJsonStr = JSON.stringify(appJson);
  const unusedVariables = (variables || []).filter(v =>
    !appJsonStr.includes(`"${v.name}"`)
  );
  results.push({
    name: 'Test for unused variables',
    status: unusedVariables.length === 0 ? 'Pass' : 'Fail',
    details: formatDetails(
      unusedVariables,
      v => `Variable '${v.name}' is defined but never used.`
    ),
  });

  return results;
}
