export function runTulipTests(appJson) {
  const results = [];
  const steps = appJson.steps || [];
  const widgets = appJson.widgets || [];
  const triggers = appJson.triggers || [];

  const triggersMap = new Map(triggers.map(t => [t._id, t]));
  const allTriggers = [];

  steps.forEach(step => {
    const stepName = step.name || 'undefined';

    // 1. Triggers defined directly in step.triggers
    (step.triggers || []).forEach(triggerId => {
      const trigger = triggersMap.get(triggerId);
      if (trigger) {
        allTriggers.push({
          ...trigger,
          stepName,
          widgetType: 'step',
          event_name: trigger.event?.type || 'unknown',
        });
      }
    });

    // 2. Triggers attached to widgets inside this step
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
              event_name: trigger.event?.type || 'unknown',
            });
          }
        });
      });
  });

  // 1. Untitled Triggers
  const untitledTriggers = allTriggers.filter(t => {
    const name = (t.description || '').trim().toLowerCase();
    return name === '' || name === 'untitled trigger';
  });
  results.push({
    name: 'Test for untitled triggers',
    status: untitledTriggers.length === 0 ? 'Pass' : 'Fail',
    details: untitledTriggers.length === 0
      ? ['No untitled triggers found.']
      : untitledTriggers.map((t, i) =>
          `${i + 1}- Found untitled trigger on step: '${t.stepName}', Location: '${t.event_name}' , Widget: '${t.widgetType}'`)
  });

  // 2. Disabled Triggers
  const disabledTriggers = allTriggers.filter(t => t.disabled === true);
  results.push({
    name: 'Test for disabled triggers',
    status: disabledTriggers.length === 0 ? 'Pass' : 'Fail',
    details: disabledTriggers.length === 0
      ? ['No disabled triggers found.']
      : disabledTriggers.map((t, i) =>
          `${i + 1}- Found disabled trigger on step: '${t.stepName}', Trigger name : '${t.description || 'unnamed'}', Location: '${t.event_name}' , Widget: '${t.widgetType}'`)
  });

  // 3. Untitled Steps
  const untitledSteps = steps.filter(
    s => !s.name || s.name.trim().toLowerCase() === 'untitled step'
  );
  results.push({
    name: 'Test for untitled steps',
    status: untitledSteps.length === 0 ? 'Pass' : 'Fail',
    details: untitledSteps.length === 0
      ? ['No untitled steps found.']
      : untitledSteps.map((s, i) =>
          `${i + 1}- Step name is '${s.name || 'undefined'}'`)
  });

  // 4. Complete App + Save App in same trigger
  const conflictingTriggers = allTriggers.filter(t =>
    (t.clauses || []).some(c =>
      (c.actions || []).some(a => a.action === 'complete_app') &&
      (c.actions || []).some(a => a.action === 'save_app')
    )
  );
  results.push({
    name: 'Test for complete app and save app data in the same trigger',
    status: conflictingTriggers.length === 0 ? 'Pass' : 'Fail',
    details: conflictingTriggers.length === 0
      ? ['No conflicting actions found.']
      : conflictingTriggers.map((t, i) =>
          `${i + 1}- Found both 'complete_app' and 'save_app' in trigger: '${t.description || 'unnamed'}' on step: '${t.stepName}'`)
  });

  // 5. Complete App + Step Change
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
    details: completeStepConflict.length === 0
      ? ['No complete + step change conflict found.']
      : completeStepConflict.map((c, i) =>
          `${i + 1}- Found a clause with 'Complete App then Change to Step' on step: '${c.step}', Trigger name: '${c.trigger}', Location: '${c.location}', Widget: '${c.widget}'`)
  });

  // 6. Triggers using user groups
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
    name: 'Test for broken triggers when using user groups (when doing import/export between instances)',
    status: userGroupTriggers.length === 0 ? 'Pass' : 'Fail',
    details: userGroupTriggers.length === 0
      ? ['No user group-based triggers found.']
      : userGroupTriggers.map((c, i) =>
          `${i + 1}- Found a trigger clause with 'user group' on step: '${c.step}', Trigger name: '${c.trigger}', Location: '${c.location}', Widget: '${c.widget}'`)
  });

  // 7. Complete App + Go to App
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
    name: 'Test for broken triggers when navigating to another app (when doing import/export between instances)',
    status: crossAppTriggers.length === 0 ? 'Pass' : 'Fail',
    details: crossAppTriggers.length === 0
      ? ['No completion with app change found.']
      : crossAppTriggers.map((c, i) =>
          `${i + 1}- Found a trigger clause with 'complete_app' and 'go_to_app' on step: '${c.step}', Trigger name: '${c.trigger}', Location: '${c.location}', Widget: '${c.widget}'`)
  });

  return results;
}
