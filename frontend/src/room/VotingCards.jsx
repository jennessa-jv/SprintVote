const CARD_VALUES = [
    "1",
    "2",
    "3",
    "5",
    "8",
    "13",
    "21",
    "?"
];


function VotingCards({
    myVote,
    revealed,
    onVote
}) {

    return (
        <div className="cards">

            <h2>
                Your Estimate
            </h2>


            <div className="card-grid">

                {CARD_VALUES.map(
                    value => (

                        <button
                            key={value}

                            className={
                                myVote === value
                                    ? "vote-card selected"
                                    : "vote-card"
                            }

                            onClick={() =>
                                onVote(value)
                            }

                            disabled={revealed}
                        >
                            {value}
                        </button>

                    )
                )}

            </div>

        </div>
    );
}


export default VotingCards;