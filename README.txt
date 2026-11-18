THESIS DATA EXPLORER
====================
Browse what people on Reddit say about diabetes and hypertension, and
how well medical studies (PubMed) support those statements.

HOW TO OPEN
-----------
1. Unzip thesis_data_explorer.zip.
2. Open the folder "thesis_data_explorer".
3. Double-click "index.html". It opens in your web browser.
   If it opens in a text editor instead: right-click index.html ->
   Open With -> Chrome, Edge, Firefox or Safari.

Nothing to install. It works offline. Internet is only needed when you
click the Reddit, PubMed, DOI or SNOMED links.

WORDS YOU WILL SEE
------------------
Claim              One factual statement taken from a Reddit post, for
                   example "Metformin lowers blood sugar".
ELMTEX fields      15 medical details (age, diagnosis, medications,
                   symptoms...) filled in automatically from each post.
SNOMED             An international medical vocabulary. Each term has a
                   code, so "high blood pressure" and "hypertension"
                   map to the same concept.
PubMed             Free database of medical research papers.
PMID               The number that identifies one paper in PubMed.
DOI                A permanent link to a published paper.
PICO               A standard way to describe a study: Population,
                   Intervention, Comparison, Outcome.
Confidence score   How strongly the studies agree with a claim, from -1
                   (they say the opposite) to +1 (they agree).
CSV                A plain table file that Excel or Google Sheets opens.
Post ID            The short code that identifies one Reddit post.
More explanations are on the Guide page.

THE MENU (top of every page)
----------------------------
Home        Overview with the main numbers and where to start.
Topics      The three communities: Diabetes, Type 2 diabetes,
            Hypertension. Open one to see its Reddit posts.
Categories  The five support levels (see below) and the claims in each.
Articles    All PubMed articles used, searchable.
Pipeline    How the data was built, step by step, with counts.
Guide       Plain-language glossary and FAQ (ELMTEX, SNOMED, PICO...).
Search box  Find posts, claims and articles by words.

THREE WAYS TO EXPLORE
---------------------
1. Topic -> Post -> Claim -> Evidence
   Pick a topic, open a post, open one of its claims, see the PubMed
   evidence for and against.
2. Category -> Claim
   Pick a support level, browse its claims, open any claim.
3. Post -> Pipeline journey
   From a post, follow its journey: raw post, filtering,
   standardization (SNOMED), PubMed search, claim extraction,
   comparison and scoring, final category.

THE FIVE CATEGORIES
-------------------
Common knowledge      Many strong studies agree. Widely backed.
Well supported        Studies agree, but less strongly than for common
                      knowledge.
Moderately supported  Studies lean towards agreeing, but weaker than
                      for most claims.
Anecdotal             No clear support either way. Personal experience
                      the studies could not confirm or refute, or a
                      claim that could not be compared.
Rarely reported       Studies tend to say the opposite, or the claim
                      goes against the literature.

DOWNLOAD A TABLE AS CSV
-----------------------
Most tables have a "Download CSV" button. It saves the rows you
currently see (filters and sort applied). Open the file in Excel or
Google Sheets.

TIPS
----
- Filters, sort and search are kept in the address bar. Bookmark a
  page to come back to the same view, or copy the link.
- The browser Back and Forward buttons work as expected.
- Scrollbars are always shown where a table or strip is wider than
  the screen; drag them or use shift + mouse wheel to scroll sideways.

HOW TO CITE
-----------
Cite Reddit post IDs and PubMed PMIDs, plus the links.
- Post ID: in the address bar after #/post/ and in the "Raw data"
  section of the post page.
- PMID: shown on each article page.
Example: Reddit post 1abc23 (r/diabetes); PubMed PMID 12345678.

KNOWN LIMITATIONS
-----------------
- SNOMED codes were assigned automatically and can be wrong.
- "Anecdotal" also includes claims that could not be compared with
  PubMed at all, not only claims where the studies showed no clear
  agreement or disagreement.
- The exact study sentence that matched is not recorded; the page
  shows likely candidates.

THE DATA
--------
Generated on 2026-11-13.
Sources: Reddit communities r/diabetes, r/diabetes_t2 and
r/hypertension; PubMed articles.
- 5,794 Reddit posts collected, 2,337 kept as valuable
- 10,970 claims extracted from the kept posts
- 2,323 PubMed articles, 8,361 PubMed claims
