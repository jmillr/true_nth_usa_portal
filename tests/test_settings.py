
from tests import TestCase


class TestPortal(TestCase):
    """Portal view tests"""

    def test_configuration_settings(self):
        self.login()
        lr_group = self.app.config['LR_GROUP']
        rv = self.client.get('/api/settings/lr_group')
        self.assert200(rv)
        self.assertEquals(rv.json.get('LR_GROUP'), lr_group)
        rv2 = self.client.get('/api/settings/bad_value')
        self.assertEquals(rv2.status_code, 400)
