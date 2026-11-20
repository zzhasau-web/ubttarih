function isGradable(question) {
  return question.options.length === 4 &&
    question.options.some(([key]) => key === question.answer);
}

function makeWorldVariants(collections) {
  const questions = collections.map(collection => collection.questions.filter(isGradable));
  return [...questions, ...questions].map((items, index) => {
    const supplemental = index >= questions.length;
    const start = supplemental ? Math.min(20, items.length) : 0;
    const ordered = [...items.slice(start), ...items.slice(0, start)];
    const next = questions[(index + 1) % questions.length];
    const seen = new Set();
    const unique = [...ordered, ...next].filter(question => {
      if (seen.has(question.text)) return false;
      seen.add(question.text);
      return true;
    });
    return {title: (index + 1) + "-нұсқа", questions: unique.slice(0, 20)};
  });
}
