import grounding_check


def test_no_invented_knowledge(template):
    result = grounding_check.run(50, player="testground")
    assert result["conversations"] >= 50
    assert result["invented"] == 0, result["examples"]
