from flask import Flask, render_template, request

from services.propublica import search_orgs, get_org
from services.website_scan import scan_website
from services.scoring import compute_readiness
from services.funders import match_funders
from services.plan import generate_plan

app = Flask(__name__)


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html", results=None, query="", state="", error=None)


@app.route("/search", methods=["GET"])
def search():
    q = request.args.get("q", "").strip()
    state = request.args.get("state", "").strip().upper()
    results = []
    error = None
    if q:
        try:
            data = search_orgs(q, state=state or None)
            results = data.get("organizations", [])
        except Exception as e:
            error = f"Search failed: {e}"
    else:
        error = "Enter an organization name to search."
    return render_template("index.html", results=results, query=q, state=state, error=error)


@app.route("/analyze/<int:ein>", methods=["GET"])
def analyze(ein):
    website_url = request.args.get("website", "").strip()

    try:
        org_json = get_org(ein)
    except Exception as e:
        return render_template(
            "index.html", results=None, query="", state="", error=f"Couldn't load EIN {ein}: {e}"
        )

    site_scan = scan_website(website_url) if website_url else None
    readiness = compute_readiness(org_json, site_scan)
    org = org_json.get("organization", {})
    ntee = org.get("ntee_code")
    funders = match_funders(ntee)
    plan_text = generate_plan(org.get("name", "This organization"), readiness, funders)

    return render_template(
        "results.html",
        org=org,
        readiness=readiness,
        funders=funders,
        plan_text=plan_text,
        site_scan=site_scan,
        website_url=website_url,
    )


if __name__ == "__main__":
    app.run(debug=True, port=5050)
