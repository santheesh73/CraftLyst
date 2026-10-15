# Rental application for Kestrel Lettings

Kestrel Lettings is a fictional letting agency. The field rules below are the spec.

## Who it is for

People applying for a flat, often on a phone and under time pressure, who need to save
progress and never lose what they typed.

## What to build

A static multi-step form, `index.html` with CSS and vanilla JS, no build step. Submission is
mocked: show a confirmation screen with a reference number generated locally.

## Steps and fields

1. About you: full name (required), email (required, valid format), phone (required), date
   of birth (required; the applicant must be 18 or older).
2. Current address: address lines, town, postcode (required), time at address (years and
   months), and a previous address if under 3 years.
3. Employment: status (employed, self-employed, student, other), employer, annual income
   (number), and an optional guarantor section that appears for students.
4. Documents: upload ID and proof of income (.pdf, .jpg, .png; at most 5 MB each; show the
   file name and size; nothing is uploaded).
5. Review: a summary of all answers with Edit links back to each step, a consent checkbox,
   and Submit.

## Constraints

- Inline validation on blur and on submit, with an error summary at the top of the step that
  links to each field.
- A progress indicator that says "Step 2 of 5" in text.
- Answers persist in `localStorage` so a reload keeps progress; offer "Clear my data".
- Every field has a visible label; required fields are marked in text.
- Works at 320px and at 200% zoom.
