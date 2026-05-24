'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { applyToInternshipAction } from '@/modules/applications/server-actions';

export function ApplyForm({
  internshipId,
  customQuestions,
}: {
  internshipId: string;
  customQuestions: Array<{ question: string; required: boolean }>;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const action = applyToInternshipAction.bind(null, internshipId);
  const customAnswers = customQuestions.map((q, i) => ({
    question: q.question,
    answer: answers[i] ?? '',
  }));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="customAnswers" value={JSON.stringify(customAnswers)} />

      <div>
        <Label htmlFor="coverNote">Cover note (optional, 1500 chars max)</Label>
        <Textarea
          id="coverNote"
          name="coverNote"
          rows={6}
          maxLength={1500}
          placeholder="Why this internship?"
        />
      </div>

      {customQuestions.map((q, i) => (
        <div key={i}>
          <Label htmlFor={`apply-q-${i}`}>
            {q.question}
            {q.required && <span className="text-[var(--danger)] ml-1">*</span>}
          </Label>
          <Textarea
            id={`apply-q-${i}`}
            rows={4}
            maxLength={2000}
            required={q.required}
            value={answers[i] ?? ''}
            onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
          />
        </div>
      ))}

      <div className="flex justify-end pt-2 border-t border-[var(--border-color)]">
        <Button type="submit" className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)]">
          Submit application →
        </Button>
      </div>
    </form>
  );
}
