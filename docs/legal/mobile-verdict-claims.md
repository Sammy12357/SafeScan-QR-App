# Mobile scan result claims

This internal record describes the mobile prototype's result wording. It is not a legal approval and the app remains an internal prototype.

| Surface | Claim | Code evidence and limit |
| --- | --- | --- |
| Current result | “No threats found in checks” | `utils/verdictCopy.ts` requires a backend result, low-risk verdict, and `verificationStatus: complete`. The statement describes configured checks at scan time; it does not guarantee safety or future behavior. |
| Current result with missing or incomplete coverage | “Could not fully check” | Missing coverage never receives the clean label or an open-destination button. The API schema preserves the backend coverage field, and the HTML upload fallback accepts only known bounded website labels. |
| Saved scan | “Lower risk score at scan time” | History does not establish current safety. Direct opening is disabled; users must scan again. |
| Demo fallback | “Demo result only” or “Demo high-risk indicators” | The result is produced locally when the backend scan fails. It cannot enable direct opening. |
| Backend high-risk finding | “High-risk indicators” | Local scoring cannot lower a backend high-risk verdict for a familiar domain. The result remains a signal-based finding, not a determination about the site's owner. |
| Direct opening | “Open destination” | Available only for a direct HTTPS URL scanned by the backend within five minutes, with completed checks, no unverified checks, no high-risk signal, and a low risk score and verdict. A destination may change after the scan. |

`tests/verdictCopy.test.mjs` checks the wording and open gate. The web server's verdict labels and coverage contract remain a dependency; review the mobile parser whenever the website result markup changes.
