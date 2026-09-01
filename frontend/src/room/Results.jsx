function Results({
    revealed,
    average
}) {

    if (!revealed) {
        return null;
    }


    return (
        <div className="result">

            <h2>
                Results
            </h2>

            <p>
                Average Vote
            </p>

            <strong>
                {average}
            </strong>

        </div>
    );
}


export default Results;