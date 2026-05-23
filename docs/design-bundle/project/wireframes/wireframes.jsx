// Sprint 1 wireframes — low-fi layouts for auth + profile flow.
// Static JSX inside DCArtboard. No state. Direct-editable.

const { useState } = React;

/* ============================================================
   01 · Signup
   ============================================================ */
function WfSignup() {
  return (
    <div className="wf">
      <div className="wf-screen">
        <div className="wf-topbar">
          <div className="wf-logo"><span className="wf-logo-star"></span>Inturn</div>
          <div className="wf-langsw"><span className="on">FR</span><span>EN</span></div>
        </div>
        <div className="wf-body">
          <div className="wf-page-narrow" style={{ paddingTop: 40 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 className="wf-h1">Create your Inturn account<span className="wf-mark">1</span></h1>
              <p className="wf-sub" style={{ margin: '8px auto 0' }}>One profile. Apply once. Work in dedicated workspaces.</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
              <div className="wf-segmented" style={{ fontSize: 13 }}>
                <span className="on">I'm an intern</span>
                <span>I'm hiring</span>
              </div>
              <span className="wf-mark">2</span>
            </div>

            <div className="wf-form">
              <div>
                <label className="wf-label">Email<span className="wf-required">*</span></label>
                <div className="wf-input">you@university.tn</div>
              </div>

              <button className="wf-btn primary" style={{ width: '100%', justifyContent: 'center', height: 44 }}>
                Send magic link →<span className="wf-mark">3</span>
              </button>

              <div className="wf-divider"><span>or</span></div>

              <button className="wf-btn" style={{ width: '100%', justifyContent: 'center', height: 44 }}>
                <span style={{ width: 16, height: 16, background: '#E4E4E7', borderRadius: 8, display: 'inline-block' }}></span>
                Continue with Google
              </button>

              <a className="wf-btn ghost" style={{ alignSelf: 'center', fontSize: 13 }}>
                Use a password instead
              </a>
            </div>

            <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px dashed #E4E4E7', textAlign: 'center', fontSize: 13, color: '#71717A' }}>
              Already have an account? <a style={{ color: '#7C3AED', fontWeight: 500 }}>Log in</a>
            </div>
          </div>
        </div>
      </div>

      <div className="wf-anno">
        <ol>
          <li><i>1</i><span><b>One screen, two paths.</b> Role selector is the primary decision here. Default to intern (volume side of the marketplace).</span></li>
          <li><i>2</i><span><b>Role pre-fills from invite link</b> (<code>?role=company</code>) — for the design partners Sam onboards in person, the wall is gone.</span></li>
          <li><i>3</i><span><b>Magic link is the default flow.</b> Clerk handles it. Password is a deferred fallback link to keep the primary path clean.</span></li>
          <li><i>4</i><span><b>Companies require work email.</b> Validate against a small denylist (gmail, yahoo, outlook). Show inline, not on submit.</span></li>
          <li><i>5</i><span><b>FR/EN switch persists immediately.</b> Once picked, it's the user's locale forever — captured in profile in J1 step 5.</span></li>
        </ol>
        <hr/>
        <h4>What's NOT here</h4>
        <ol>
          <li><i>—</i><span>No avatar / profile photo at signup. Intern profile pic is captured later, never required.</span></li>
          <li><i>—</i><span>No "About Inturn" copy. If they got here, they decided. Don't sell again.</span></li>
          <li><i>—</i><span>No social proof ("Join 200+ interns"). Comes back when the number is &gt;500.</span></li>
        </ol>
        <hr/>
        <h4>Stack notes</h4>
        <ol>
          <li><i>+</i><span><b>Clerk</b> for auth — magic link, Google OAuth, organizations. Role stored in <code>user.publicMetadata.role</code>.</span></li>
        </ol>
      </div>
    </div>
  );
}

/* ============================================================
   02 · Profile basics (intern)
   ============================================================ */
function WfProfileBasics() {
  return (
    <div className="wf">
      <div className="wf-screen">
        <div className="wf-topbar">
          <div className="wf-logo"><span className="wf-logo-star"></span>Inturn</div>
          <div className="wf-langsw"><span className="on">FR</span><span>EN</span></div>
        </div>
        <div className="wf-body">
          <div className="wf-page-wide">
            <div className="wf-steps">
              <span className="wf-step on"><b>01</b> Basics</span>
              <span className="wf-step-sep"></span>
              <span className="wf-step"><b>02</b> Skills + CV</span>
              <span className="wf-step-sep"></span>
              <span className="wf-step"><b>03</b> Done</span>
            </div>

            <h1 className="wf-h1">Tell us about you<span className="wf-mark">1</span></h1>
            <p className="wf-sub">30 seconds. We use this to match you to the right internships.</p>

            <div className="wf-form">
              <div className="wf-row">
                <div>
                  <label className="wf-label">First name<span className="wf-required">*</span></label>
                  <div className="wf-input">Yasmine</div>
                </div>
                <div>
                  <label className="wf-label">Last name<span className="wf-required">*</span></label>
                  <div className="wf-input">Ben Salah</div>
                </div>
              </div>

              <div>
                <label className="wf-label">University<span className="wf-required">*</span><span className="wf-mark">2</span></label>
                <div className="wf-input select">ENIT — École Nationale d'Ingénieurs de Tunis</div>
                <p className="wf-helper">Searchable list of 300+ Tunisian universities + grandes écoles.</p>
              </div>

              <div className="wf-row">
                <div>
                  <label className="wf-label">Year of study<span className="wf-required">*</span></label>
                  <div className="wf-input select">3<sup>e</sup> année (L3 / Engineering 3)</div>
                </div>
                <div>
                  <label className="wf-label">Field<span className="wf-required">*</span></label>
                  <div className="wf-input select">Computer Science</div>
                </div>
              </div>

              <div>
                <label className="wf-label">City<span className="wf-mark">3</span></label>
                <div className="wf-input select">Tunis</div>
                <p className="wf-helper">Sets default on-site filter. Doesn't block remote applications.</p>
              </div>

              <div>
                <label className="wf-label">Preferred language<span className="wf-required">*</span><span className="wf-mark">4</span></label>
                <div className="wf-segmented" style={{ fontSize: 13 }}>
                  <span className="on">Français</span>
                  <span>English</span>
                </div>
                <p className="wf-helper">This sets the app's language and the default for your applications.</p>
              </div>

              <div className="wf-btns">
                <button className="wf-btn ghost" disabled>← Back</button>
                <button className="wf-btn primary">Continue → <span className="wf-mark">5</span></button>
              </div>
            </div>
          </div>
        </div>

        <div className="wf-preview">
          <div className="wf-preview-head">Live preview · public profile</div>
          <div className="avatar"></div>
          <div className="nm">Yasmine Ben Salah</div>
          <div className="meta">ENIT · L3 · Computer Science</div>
          <div className="meta">Tunis · FR / EN</div>
          <div className="ph"></div>
          <div className="ph short"></div>
        </div>
      </div>

      <div className="wf-anno">
        <ol>
          <li><i>1</i><span><b>Hard 30-second budget.</b> If users take longer than this on step 1, the field count is wrong. Cut, don't add.</span></li>
          <li><i>2</i><span><b>University is the highest-signal field.</b> Pre-seeded list of 300+ Tunisian institutions. Combobox (component #6) — start with the top 30 prefiltered.</span></li>
          <li><i>3</i><span><b>City defaults the on-site filter.</b> Doesn't restrict — virtual internships are visible to all.</span></li>
          <li><i>4</i><span><b>FR by default for Tunisia.</b> Locale flips the whole app and email templates from this moment.</span></li>
          <li><i>5</i><span><b>Continue is enabled when required fields are filled.</b> Validate inline (blur), not on submit.</span></li>
        </ol>
        <hr/>
        <h4>Components used</h4>
        <ol>
          <li><i>+</i><span><code>Input</code> (#02), <code>Select</code> (#05), <code>Combobox</code> (#06), <code>Form</code> (#04). All Sprint-1 foundation tier.</span></li>
        </ol>
        <hr/>
        <h4>FR/EN parity</h4>
        <ol>
          <li><i>!</i><span>Every label + helper + placeholder needs a French equivalent before this ships. Use <code>useTranslations('profile.basics')</code>.</span></li>
        </ol>
      </div>
    </div>
  );
}

/* ============================================================
   03 · Profile skills + CV (intern)
   ============================================================ */
function WfProfileSkills() {
  return (
    <div className="wf">
      <div className="wf-screen">
        <div className="wf-topbar">
          <div className="wf-logo"><span className="wf-logo-star"></span>Inturn</div>
          <div className="wf-langsw"><span className="on">FR</span><span>EN</span></div>
        </div>
        <div className="wf-body">
          <div className="wf-page-wide">
            <div className="wf-steps">
              <span className="wf-step done"><b>01</b> Basics</span>
              <span className="wf-step-sep"></span>
              <span className="wf-step on"><b>02</b> Skills + CV</span>
              <span className="wf-step-sep"></span>
              <span className="wf-step"><b>03</b> Done</span>
            </div>

            <h1 className="wf-h1">Your skills<span className="wf-mark">1</span></h1>
            <p className="wf-sub">3 to 8 skills. Specific beats generic — "React" wins over "frontend".</p>

            <div className="wf-form">
              <div>
                <label className="wf-label">Skills<span className="wf-required">*</span></label>
                <div className="wf-chips">
                  <span className="wf-chip">React<span className="wf-chip-x">×</span></span>
                  <span className="wf-chip">TypeScript<span className="wf-chip-x">×</span></span>
                  <span className="wf-chip">Figma<span className="wf-chip-x">×</span></span>
                  <span className="wf-chip">User research<span className="wf-chip-x">×</span></span>
                  <span className="wf-chip add">+ Add a skill</span>
                </div>
                <p className="wf-helper">4 / 8 added. <a style={{ color: '#7C3AED' }}>See suggestions ↗</a></p>
              </div>

              <div className="wf-divider"><span>then</span></div>

              <div>
                <label className="wf-label">What kind of role do you want?<span className="wf-mark">2</span></label>
                <p className="wf-helper" style={{ marginBottom: 10, marginTop: 0 }}>Pick up to 3. We use these as the primary match.</p>
                <div className="wf-rolechips">
                  <span className="wf-rolechip on">Design</span>
                  <span className="wf-rolechip on">Product</span>
                  <span className="wf-rolechip">Engineering</span>
                  <span className="wf-rolechip">Marketing</span>
                  <span className="wf-rolechip">Data</span>
                  <span className="wf-rolechip">Operations</span>
                  <span className="wf-rolechip">Content</span>
                  <span className="wf-rolechip">Finance</span>
                  <span className="wf-rolechip">Sales</span>
                </div>
              </div>

              <div className="wf-divider"><span>and</span></div>

              <div>
                <label className="wf-label">CV<span style={{ color: '#A1A1AA', fontWeight: 400, marginLeft: 6 }}>optional</span><span className="wf-mark">3</span></label>
                <div className="wf-drop">
                  <b>Drop your CV here or click to browse</b>
                  PDF, max 5 MB · We'll read it and suggest more skills
                  <br/><br/>
                  <small>Hosted by UploadThing → encrypted at rest</small>
                </div>
                <a className="wf-btn ghost" style={{ marginTop: 8, fontSize: 13, padding: 0 }}>Skip CV for now</a>
              </div>

              <div className="wf-divider"><span>links (optional)</span></div>

              <div>
                <label className="wf-label">Portfolio &amp; links<span className="wf-mark">4</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="wf-row r-3" style={{ gridTemplateColumns: '110px 1fr 32px' }}>
                    <div className="wf-input select">GitHub</div>
                    <div className="wf-input">github.com/yasmine</div>
                    <div className="wf-input" style={{ justifyContent: 'center' }}>×</div>
                  </div>
                  <div className="wf-row r-3" style={{ gridTemplateColumns: '110px 1fr 32px' }}>
                    <div className="wf-input select">Behance</div>
                    <div className="wf-input">behance.net/yasmine</div>
                    <div className="wf-input" style={{ justifyContent: 'center' }}>×</div>
                  </div>
                </div>
                <a className="wf-btn ghost" style={{ fontSize: 13, padding: 0, marginTop: 8 }}>+ Add another link</a>
              </div>

              <div className="wf-btns">
                <button className="wf-btn ghost">← Back</button>
                <button className="wf-btn primary">Finish profile →</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wf-anno">
        <ol>
          <li><i>1</i><span><b>Hard cap at 8 skills.</b> Disable "Add" at 8, show count. Forces specificity, keeps the matching signal clean.</span></li>
          <li><i>2</i><span><b>Role chips, not free text.</b> 9 fixed categories. Don't let "Other" through — every "Other" is data we can't match against.</span></li>
          <li><i>3</i><span><b>CV is optional but high-leverage.</b> Sprint 6 AI parses it to suggest more skills. Until then, the upload is captured but unused.</span></li>
          <li><i>4</i><span><b>Link rows are deletable, repeatable.</b> Validate URL format client-side only. Don't block on dead links.</span></li>
        </ol>
        <hr/>
        <h4>Profile completion gate</h4>
        <ol>
          <li><i>!</i><span><b>Minimum to apply:</b> 3 skills + 1 role chip + university + year. Anything less, "Apply" CTAs route back here.</span></li>
          <li><i>!</i><span><b>Show completion %</b> on the dashboard, not a "fill this in" banner. Carrots, not sticks.</span></li>
        </ol>
        <hr/>
        <h4>Components used</h4>
        <ol>
          <li><i>+</i><span><code>Multi-select chip</code> (#07 custom), <code>File upload</code> (#13 custom over UploadThing), <code>Combobox</code> (#06).</span></li>
        </ol>
      </div>
    </div>
  );
}

/* ============================================================
   04 · Org profile (company)
   ============================================================ */
function WfOrgProfile() {
  return (
    <div className="wf">
      <div className="wf-screen">
        <div className="wf-topbar">
          <div className="wf-logo"><span className="wf-logo-star"></span>Inturn</div>
          <div className="wf-langsw"><span>FR</span><span className="on">EN</span></div>
        </div>
        <div className="wf-body">
          <div className="wf-page-wide">
            <div className="wf-steps">
              <span className="wf-step on"><b>01</b> Company</span>
              <span className="wf-step-sep"></span>
              <span className="wf-step"><b>02</b> Verify (later)</span>
            </div>

            <h1 className="wf-h1">About your company<span className="wf-mark">1</span></h1>
            <p className="wf-sub">What design partners and interns see. You can edit anything later.</p>

            <div className="wf-form">
              <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 20, alignItems: 'start' }}>
                <div>
                  <label className="wf-label">Logo</label>
                  <div className="wf-logoup">Drop</div>
                  <p className="wf-helper">Optional</p>
                </div>
                <div>
                  <label className="wf-label">Company name<span className="wf-required">*</span></label>
                  <div className="wf-input">Acme Studio</div>
                  <div style={{ height: 16 }}></div>
                  <label className="wf-label">Website</label>
                  <div className="wf-input">acmestudio.tn</div>
                </div>
              </div>

              <div className="wf-row">
                <div>
                  <label className="wf-label">Industry<span className="wf-required">*</span></label>
                  <div className="wf-input select">Design &amp; creative</div>
                </div>
                <div>
                  <label className="wf-label">Company size<span className="wf-required">*</span></label>
                  <div className="wf-input select">11–50 employees</div>
                </div>
              </div>

              <div className="wf-row">
                <div>
                  <label className="wf-label">Country<span className="wf-required">*</span></label>
                  <div className="wf-input select">Tunisia</div>
                </div>
                <div>
                  <label className="wf-label">City</label>
                  <div className="wf-input">Tunis</div>
                </div>
              </div>

              <div>
                <label className="wf-label">Short description<span className="wf-mark">2</span></label>
                <div className="wf-textarea">We design brands &amp; digital products for the Maghreb. 12 people, working with founders from idea to launch...</div>
                <p className="wf-helper">280 characters · Shows on every public listing. <span style={{ color: '#16A34A' }}>156 / 280</span></p>
              </div>

              <div className="wf-divider"><span>verification</span></div>

              <div className="wf-banner">
                <span className="dot"></span>
                <div>
                  <b>Verification is required before your first acceptance — not now.<span className="wf-mark">3</span></b>
                  You can draft listings, browse profiles, and prepare your workspace. Posting publicly and accepting interns needs business registry docs.
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="wf-label">RNE / business registry<span style={{ color: '#A1A1AA', fontWeight: 400, marginLeft: 6 }}>do now (optional)</span></label>
                <div className="wf-drop" style={{ padding: 18 }}>
                  <b>Upload registry document</b>
                  PDF or image · Reviewed by our team in &lt;24h
                </div>
              </div>

              <div className="wf-btns">
                <button className="wf-btn ghost">Save as draft<span className="wf-mark">4</span></button>
                <button className="wf-btn primary">Continue → Post first internship</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wf-anno">
        <ol>
          <li><i>1</i><span><b>Lightweight at signup.</b> Don't gate the funnel on legal docs. Verification is its own admin queue.</span></li>
          <li><i>2</i><span><b>Description is the public-facing copy.</b> Shows on every listing card. Character cap forces a real elevator pitch.</span></li>
          <li><i>3</i><span><b>RNE deferred to first acceptance.</b> Per J3 — design partners get hand-holding from Sam, don't need this here.</span></li>
          <li><i>4</i><span><b>"Save as draft" is a real action.</b> A company should be able to log out here and come back without losing data.</span></li>
        </ol>
        <hr/>
        <h4>Design-partner override</h4>
        <ol>
          <li><i>!</i><span><b>First 10 companies don't see this screen at all.</b> Sam fills it in for them in the admin panel during the 15-min onboarding call.</span></li>
          <li><i>!</i><span>Admin "impersonate company" capability needs to ship in Sprint 1, even if no UI for it — direct DB writes are fine.</span></li>
        </ol>
        <hr/>
        <h4>Verification queue</h4>
        <ol>
          <li><i>+</i><span>Account state machine: <code>draft → pending → verified → suspended</code>. Only <code>verified</code> can post + accept.</span></li>
          <li><i>+</i><span>Status visible in top-bar badge for every company user until verified.</span></li>
        </ol>
      </div>
    </div>
  );
}

/* ============================================================
   05 · Landing polish notes — different format (no wireframe)
   ============================================================ */
function WfLandingPolish() {
  return (
    <div className="wf">
      <div className="wf-screen">
        <div className="wf-body" style={{ padding: 36 }}>
          <div className="wf-page-wide">
            <div className="wf-steps">
              <span className="wf-step done"><b>S1</b> Polish only</span>
              <span className="wf-step-sep"></span>
              <span className="wf-step"><b>—</b> No re-skin</span>
            </div>

            <h1 className="wf-h1">Landing page · polish-only spec</h1>
            <p className="wf-sub">Existing landing is Studio-flavored (cream, gradient, serif). <b>Keep it.</b> It already does the brand-impression work at the top of funnel. This is the surgical list.</p>

            <div className="polish-block">
              <div className="polish-block-head"><b>Hero CTAs</b><span className="tag">High impact · 30 min</span></div>
              <div className="polish-row is-curr"><span className="k">Current</span><div className="v"><s>"Discover →"</s> + <s>"Watch Demo"</s> — both primary, unclear hierarchy</div></div>
              <div className="polish-row is-new"><span className="k">Change</span><div className="v"><b>"Browse internships"</b> (primary) + <b>"I'm hiring →"</b> (ghost)</div></div>
              <div className="polish-row is-why"><span className="k">Why</span><div className="v">Marketplace volume sits on the intern side. Lead with that. Companies get a second-place CTA, not a second-line one.</div></div>
            </div>

            <div className="polish-block">
              <div className="polish-block-head"><b>Top nav</b><span className="tag">Medium · 1h</span></div>
              <div className="polish-row is-curr"><span className="k">Current</span><div className="v"><s>Home · About · Services · Pricing · Contact + Login / Get Started</s></div></div>
              <div className="polish-row is-new"><span className="k">Change</span><div className="v"><b>Browse internships · For companies · Pricing · Log in · Sign up</b></div></div>
              <div className="polish-row is-why"><span className="k">Why</span><div className="v">"Browse internships" is the SEO entry point. "About" and "Contact" go to the footer where they belong.</div></div>
            </div>

            <div className="polish-block">
              <div className="polish-block-head"><b>FR / EN switch</b><span className="tag">Low · 15 min</span></div>
              <div className="polish-row is-curr"><span className="k">Current</span><div className="v"><s>"FR" as a styled text link in the nav</s></div></div>
              <div className="polish-row is-new"><span className="k">Change</span><div className="v">Two-letter segmented control: <span className="wf-segmented" style={{ fontSize: 11, display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 }}><span className="on">FR</span><span>EN</span></span> — same component used in app</div></div>
              <div className="polish-row is-why"><span className="k">Why</span><div className="v">FR/EN is the recurring miss. Fix once on landing, reuse the control in the app, in emails, in the PDF Intern Record.</div></div>
            </div>

            <div className="polish-block">
              <div className="polish-block-head"><b>Footer</b><span className="tag">Medium · 1h</span></div>
              <div className="polish-row is-curr"><span className="k">Current</span><div className="v">Pages · Contact · Licence · Social</div></div>
              <div className="polish-row is-new"><span className="k">Change</span><div className="v">Add <b>"Tunisia 🇹🇳"</b> placement indicator, link <b>"For universities"</b> (Phase 2 page, ships as a thin landing for institutional intake)</div></div>
              <div className="polish-row is-why"><span className="k">Why</span><div className="v">Local-first signal. Universities aren't a Phase 1 buyer, but the link earns search and tells them we exist.</div></div>
            </div>

            <div className="polish-block">
              <div className="polish-block-head"><b>Sign-up handoff</b><span className="tag">High · the transition</span></div>
              <div className="polish-row is-curr"><span className="k">Current</span><div className="v">Cream serif landing → clicks "Get Started" → ?</div></div>
              <div className="polish-row is-new"><span className="k">Change</span><div className="v">Cream serif landing → clicks <b>"Sign up"</b> → lands in <b>Workshop-themed signup</b> (white sans, slate neutrals). Visual jump is intentional: marketing → product.</div></div>
              <div className="polish-row is-why"><span className="k">Why</span><div className="v">Soften the jump with: <b>Inturn gradient star</b> on both sides, <b>violet primary CTA</b> on both sides. The brand bridge is the logo and the purple.</div></div>
            </div>

            <div className="polish-keep">
              <h5>Do NOT change</h5>
              <ul>
                <li>The Inturn gradient star illustration in the hero — that's the brand</li>
                <li>"What Sets Inturn Apart" three-pillar section</li>
                <li>"Other platforms vs Inturn" comparison table</li>
                <li>The "More than internships, a mission for change" SDG section</li>
                <li>Sami Arif's quote in the trust block</li>
                <li>FAQ section</li>
                <li>Brand colors (gradient + cream) and serif type system</li>
              </ul>
            </div>

            <p className="wf-helper" style={{ marginTop: 22 }}>
              <b>Estimated total work:</b> 4–6 hours. Bundle with Sprint 1 deploy. Do not redesign — surgical only.
            </p>
          </div>
        </div>
      </div>

      <div className="wf-anno">
        <ol>
          <li><i>1</i><span><b>Landing is Studio. App is Workshop.</b> Two visual systems intentionally — a deliberate handoff at the sign-up wall.</span></li>
          <li><i>2</i><span><b>Don't add filler.</b> The landing is already 7900px tall. Anything new = something else cut. Phase 2 = ruthless edit.</span></li>
          <li><i>3</i><span><b>Pricing page is a Phase 1 nice-to-have.</b> Punt to S6 if pressed for time. Don't link in nav until it exists.</span></li>
          <li><i>4</i><span><b>FR/EN parity</b> on every changed string before merging. Reuse the same translation keys as the app where possible.</span></li>
        </ol>
        <hr/>
        <h4>Effort breakdown</h4>
        <ol>
          <li><i>30m</i><span>Hero CTAs (copy + style swap)</span></li>
          <li><i>1h</i><span>Top nav restructure + new links</span></li>
          <li><i>15m</i><span>FR/EN segmented control</span></li>
          <li><i>1h</i><span>Footer additions + universities placeholder page</span></li>
          <li><i>30m</i><span>Sign-up handoff visual continuity (logo + violet)</span></li>
          <li><i>1h</i><span>FR/EN review pass, copy-edit</span></li>
        </ol>
        <hr/>
        <h4>Owner</h4>
        <ol>
          <li><i>+</i><span>Claude Code lifts the existing landing JSX, applies these changes inline. No new design file needed.</span></li>
        </ol>
      </div>
    </div>
  );
}

/* ============================================================
   App composition — mount on the canvas
   ============================================================ */
function App() {
  return (
    <DesignCanvas>
      <DCSection
        id="sprint-1"
        title="Sprint 1 wireframes"
        subtitle="Auth + profile creation flow — the 5 screens that ship weeks 1–2. Low-fi, Workshop-direction-aware, designed to be picked up by Claude Code without further interpretation."
      >
        <DCArtboard id="signup" label="01 · Signup · intern + company" width={1500} height={920}>
          <WfSignup />
        </DCArtboard>
        <DCArtboard id="basics" label="02 · Profile · basics (intern)" width={1500} height={1100}>
          <WfProfileBasics />
        </DCArtboard>
        <DCArtboard id="skills" label="03 · Profile · skills + CV (intern)" width={1500} height={1280}>
          <WfProfileSkills />
        </DCArtboard>
        <DCArtboard id="org" label="04 · Org profile (company)" width={1500} height={1180}>
          <WfOrgProfile />
        </DCArtboard>
        <DCArtboard id="polish" label="05 · Landing page · polish notes" width={1500} height={1600}>
          <WfLandingPolish />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
