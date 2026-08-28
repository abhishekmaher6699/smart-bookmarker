import json
import pathlib
import shutil


NOTEBOOK = pathlib.Path(r"C:\Users\Abhishek\Downloads\125M1H054_ADS_EL_A2.ipynb")


def set_src(nb, idx, text):
    nb["cells"][idx]["source"] = text.splitlines(keepends=True)


def main():
    backup = NOTEBOOK.with_suffix(".backup_before_small_edits.ipynb")
    if not backup.exists():
        shutil.copy2(NOTEBOOK, backup)

    nb = json.loads(NOTEBOOK.read_text(encoding="utf-8"))

    set_src(
        nb,
        0,
        """<div align="center">

![Course](https://img.shields.io/badge/Course-Advanced%20Data%20Science%20Lab-blue?style=for-the-badge&logo=python&logoColor=white)
![Code](https://img.shields.io/badge/Code-MCA33PE21-informational?style=for-the-badge)
![Assignment](https://img.shields.io/badge/Experiential%20Learning-02-success?style=for-the-badge)

---

# Advanced Data Science Lab [MCA33PE21]
## Experiential Learning Assignment - 02
### Streamlit Web App Development

---
<br>

| Field | Details |
|---|---|
| **Academic Year** | **2026-2027** |
| **Class / Division** | **SYMCA (Semester-I)** |
| **PRN** | **125M1H054** |
| **Student Name** | **Abhishek Maher** |
| **Submission Date** | **06/08/2026** |
</div>""",
    )

    set_src(
        nb,
        2,
        """## Course Outcomes: CO1, CO2

This assignment focuses on designing interactive, data-driven web applications using **Streamlit**. The apps include data loading, basic cleaning, statistical summaries, and visualizations using Matplotlib/Seaborn.""",
    )

    set_src(
        nb,
        3,
        """## Setup - Required Libraries

I used the following cell to import the common Python libraries needed for all four Streamlit apps.""",
    )

    notes = {
        5: """---
## App 1: Retail Sales Dashboard

**Task:** Create an interactive Streamlit web app to analyze daily retail sales data and visualize product performance.

For this app, I first prepare the sales data, then calculate daily/category-wise summaries and show the trends using charts.

**Expected Features:**
- Load and preview a retail sales dataset.
- Show summary statistics - mean and median of daily revenue.
- Group and display total units sold and revenue by product category in a table.
- Line chart showing daily revenue trend over time.
- Bar chart comparing total revenue across product categories.""",
        14: """---
## App 2: Student Grades Explorer

**Task:** Build a Streamlit web app to explore student performance data across different subjects and visualize their scores.

Here I used a subject dropdown so that the same dashboard can show both overall distribution and subject-specific performance.

**Expected Features:**
- Load and preview a grades dataset.
- Allow the user to select a subject from a dropdown menu.
- Display summary statistics for the selected subject: mean, median, and standard deviation of final scores.
- Show a boxplot comparing final score distributions across subjects.
- Show a scatterplot of Test1 vs Final scores, colored by subject, for the selected subject.""",
        23: """---
## App 3: Movie Ratings Explorer

**Task:** Develop a Streamlit web app that allows users to explore and analyze movie ratings data based on selected genres.

In this dashboard, I also handle missing values before plotting because ratings and vote counts are important for the final charts.

**Expected Features:**
- Load and preview a movie dataset.
- Drop rows with missing values in key columns.
- Allow the user to select a genre using a dropdown.
- Show summary statistics for the selected genre: average rating, average number of votes, and median year of release.
- Show a boxplot comparing the distribution of movie ratings across all genres.
- Display a scatterplot of Votes vs Rating for the selected genre: use vote count as the marker size and rating as the color gradient.""",
        32: """---
## App 4: Titanic Survival Analysis Dashboard

**Task:** Build a Streamlit dashboard to analyze survival trends from the Titanic dataset.

For the Titanic app, I convert the coded columns into readable labels and then compare survival patterns by class, gender, and age.

**Expected Features:**
- Preview the dataset and perform basic data cleaning (drop missing values and map numeric codes to labels for survival and class).
- Calculate and display survival rates by passenger class and gender using grouped percentages.
- Visualize the age distribution by survival status using a boxplot to understand age patterns among survivors and non-survivors.
- Compute and display the average age for both survivors and non-survivors.""",
    }
    for idx, text in notes.items():
        set_src(nb, idx, text)

    set_src(
        nb,
        41,
        """---
## Summary

| # | App | Data File | Streamlit File |
|---|---|---|---|
| 1 | Retail Sales Dashboard | `retail_sales.csv` | `retail_sales_app.py` |
| 2 | Student Grades Explorer | `student_grades.csv` | `student_grades_app.py` |
| 3 | Movie Ratings Explorer | `movie_ratings.csv` | `movie_ratings_app.py` |
| 4 | Titanic Survival Analysis Dashboard | `titanic.csv` | `titanic_dashboard_app.py` |

All four apps use a similar workflow: load the dataset, clean or prepare it where needed, calculate summary statistics, add an interactive control, and display the final charts with Matplotlib/Seaborn in Streamlit.""",
    )

    replacements = {
        'st.title("ðŸ›’ Retail Sales Dashboard")': 'st.title("Retail Sales Dashboard")',
        'st.subheader("ðŸ“„ Dataset Preview")': 'st.subheader("Dataset Preview")',
        'st.subheader("ðŸ“Š Summary Statistics â€” Daily Revenue")': 'st.subheader("Summary Statistics - Daily Revenue")',
        "# 3. Group by product category â€” units sold & revenue": "# 3. Group by product category - units sold and revenue",
        'st.subheader("ðŸ“¦ Total Units Sold & Revenue by Product Category")': 'st.subheader("Total Units Sold and Revenue by Product Category")',
        "# 4. Line chart â€” daily revenue trend": "# 4. Line chart - daily revenue trend",
        'st.subheader("ðŸ“ˆ Daily Revenue Trend")': 'st.subheader("Daily Revenue Trend")',
        "# 5. Bar chart â€” revenue across product categories": "# 5. Bar chart - revenue across product categories",
        'st.subheader("ðŸ“Š Total Revenue by Product Category")': 'st.subheader("Total Revenue by Product Category")',
        'st.caption("Experiential Learning Assignment 02 â€” Retail Sales Dashboard")': 'st.caption("Experiential Learning Assignment 02 - Retail Sales Dashboard")',
        'st.title("ðŸŽ“ Student Grades Explorer")': 'st.title("Student Grades Explorer")',
        'st.subheader(f"ðŸ“Š Summary Statistics â€” {selected_subject} (Final Scores)")': 'st.subheader(f"Summary Statistics - {selected_subject} (Final Scores)")',
        "# 4. Boxplot â€” final score distribution across all subjects": "# 4. Boxplot - final score distribution across all subjects",
        'st.subheader("ðŸ“¦ Final Score Distribution Across Subjects")': 'st.subheader("Final Score Distribution Across Subjects")',
        "# 5. Scatterplot â€” Test1 vs Final for the selected subject": "# 5. Scatterplot - Test1 vs Final for the selected subject",
        'st.subheader(f"ðŸ”µ Test1 vs Final Scores â€” {selected_subject}")': 'st.subheader(f"Test1 vs Final Scores - {selected_subject}")',
        'st.caption("Experiential Learning Assignment 02 â€” Student Grades Explorer")': 'st.caption("Experiential Learning Assignment 02 - Student Grades Explorer")',
        'st.title("ðŸŽ¬ Movie Ratings Explorer")': 'st.title("Movie Ratings Explorer")',
        'st.subheader("ðŸ“„ Dataset Preview (raw)")': 'st.subheader("Dataset Preview (raw)")',
        'st.subheader(f"ðŸ“Š Summary Statistics â€” {selected_genre}")': 'st.subheader(f"Summary Statistics - {selected_genre}")',
        "# 5. Boxplot â€” rating distribution across all genres": "# 5. Boxplot - rating distribution across all genres",
        'st.subheader("ðŸ“¦ Rating Distribution Across All Genres")': 'st.subheader("Rating Distribution Across All Genres")',
        "# 6. Scatterplot â€” Votes vs Rating for the selected genre": "# 6. Scatterplot - Votes vs Rating for the selected genre",
        'st.subheader(f"ðŸ”µ Votes vs Rating â€” {selected_genre}")': 'st.subheader(f"Votes vs Rating - {selected_genre}")',
        'st.caption("Experiential Learning Assignment 02 â€” Movie Ratings Explorer")': 'st.caption("Experiential Learning Assignment 02 - Movie Ratings Explorer")',
        'st.title("ðŸš¢ Titanic Survival Analysis Dashboard")': 'st.title("Titanic Survival Analysis Dashboard")',
        'st.subheader("ðŸ“Š Survival Rate by Passenger Class and Gender")': 'st.subheader("Survival Rate by Passenger Class and Gender")',
        "# 3. Age distribution by survival status â€” boxplot": "# 3. Age distribution by survival status - boxplot",
        'st.subheader("ðŸ“¦ Age Distribution by Survival Status")': 'st.subheader("Age Distribution by Survival Status")',
        'st.subheader("ðŸ“ˆ Average Age by Survival Status")': 'st.subheader("Average Age by Survival Status")',
        'col1.metric("Avg. Age â€” Survivors", f"{avg_age.get(\'Survived\', float(\'nan\')):.2f} yrs")': 'col1.metric("Avg. Age - Survivors", f"{avg_age.get(\'Survived\', float(\'nan\')):.2f} yrs")',
        'col2.metric("Avg. Age â€” Non-Survivors", f"{avg_age.get(\'Did Not Survive\', float(\'nan\')):.2f} yrs")': 'col2.metric("Avg. Age - Non-Survivors", f"{avg_age.get(\'Did Not Survive\', float(\'nan\')):.2f} yrs")',
        'st.caption("Experiential Learning Assignment 02 â€” Titanic Survival Analysis Dashboard")': 'st.caption("Experiential Learning Assignment 02 - Titanic Survival Analysis Dashboard")',
        'f"â‚¹{daily_revenue.mean():,.2f}"': 'f"Rs. {daily_revenue.mean():,.2f}"',
        'f"â‚¹{daily_revenue.median():,.2f}"': 'f"Rs. {daily_revenue.median():,.2f}"',
    }

    for cell in nb["cells"]:
        if cell.get("cell_type") != "code":
            continue
        src = "".join(cell.get("source", []))
        for old, new in replacements.items():
            src = src.replace(old, new)
        cell["source"] = src.splitlines(keepends=True)

    NOTEBOOK.write_text(json.dumps(nb, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"UPDATED {NOTEBOOK}")
    print(f"BACKUP {backup}")


if __name__ == "__main__":
    main()
