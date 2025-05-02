from typing import List
import logging

from flask import Flask, Blueprint, jsonify, request, send_from_directory
from flask import request
from flask_cors import CORS
from flasgger import Swagger, APISpec
from webargs.flaskparser import use_args, parser
from marshmallow import ValidationError
import marshmallow.class_registry as _registry

from apispec.ext.marshmallow import MarshmallowPlugin
from apispec_webframeworks.flask import FlaskPlugin
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

from backend.db import get_session, load_db

from backend.helpers import create_flask_app, get_traceback

app = create_flask_app()
db = load_db()

CORS(app)

from backend.models import Content, Campaign
from backend.schemas import (
    ContentSchema,
    ContentCreateRequest,
    ContentUpdateRequest,
    ContentResponse,
    ContentListResponse,
    CampaignCreateRequest,
    CampaignListResponse,
    CampaignResponse,
    CampaignSchema,
    CampaignUpdateRequest,
    ErrorResponse,
)

# Configure logging
logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)


api_v1 = Blueprint('api_v1', __name__, url_prefix='/v1')

# Plugins for flask and Marshmallow
plugins = [FlaskPlugin(), MarshmallowPlugin()]

# Create the APISpec object
spec = APISpec(
    title="Spock API Docs",
    version="1.0",
    openapi_version="2.0",
    plugins=plugins
)

# Generate a Flasgger template including your schema definitions
template = spec.to_flasgger(
    app,
    definitions=[
        ContentCreateRequest,
        ContentResponse,
        ContentUpdateRequest,
        ContentListResponse,
        CampaignCreateRequest,
        CampaignResponse,
        CampaignUpdateRequest,
        CampaignListResponse,
        ErrorResponse,
    ]
)

swagger = Swagger(
    app,
    template=template,
    parse=True,
    )
swagger.config['defaultModelPropertiesSorted'] = False

Session = get_session()

@app.errorhandler(422)
@app.errorhandler(400)
def handle_validation_error(err):
    # webargs attaches additional metadata to the error object
    exc = getattr(err, "exc", None)
    if exc:
        messages = exc.messages # Validation errors as dict
    else:
        messages = [f"Invalid request: {getattr(err, 'description')}."]
    return jsonify({"errors": messages}), err.code

@app.errorhandler(500)
def internal_server_error(e):
    # Log full stack trace
    logger.error("Unhandled exception", exc_info=True)

    response = {
        "message": "Internal Server Error",
        "error": str(e)
    }
    return jsonify(response), 500

@app.before_request
def log_request_info():
    print(f"\n🟢 Incoming Request: {request.method} {request.url}")
    print(f"Headers: {dict(request.headers)}")
    print(f"Body: {request.get_data(as_text=True)}")

@app.after_request
def log_response_info(response):
    print(f"🔵 Outgoing Response: {response.status}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Body: {response.get_data(as_text=True)}")
    return response
    
# region Content APIs

@api_v1.route('/content', methods=['POST'])
@use_args(ContentCreateRequest)
def create_content(payload):
    """
    Create Content
    ---
    tags:
      - Content
    parameters:
      - in: body
        name: body
        schema:
          $ref: '#/definitions/ContentCreateRequest'
        required: true
        description: Content data
    responses:
      201:
        description: Content created successfully
        schema:
          $ref: '#/definitions/ContentResponse'
      400:
        description: Invalid request body
        schema:
          $ref: '#/definitions/ErrorResponse'
      500:
        description: Error creating content
        schema:
          $ref: '#/definitions/ErrorResponse'
    """

    content_data = payload
        
    campaign_id = content_data.get('campaign_id')
    order = content_data.get('order')

    try:

        # Use db.session to query the campaign record by ID
        campaign = Campaign.query.filter_by(id=campaign_id).first()

        if not campaign:
            return ErrorResponse().dump(dict(message=f"Campaign with the ID '{campaign_id}' not found", error="Campaign not found")), 404

    except Exception as e:
        get_traceback(e)
        logger.error(f"Error getting campaign: {e}")
        return ErrorResponse().dump(dict(message="Error getting campaign", error=str(e))), 500

    # Ensure no two contents under a campaign have the same order
    if order is not None:
        # Find content with same campaign_id and order
        existing_content = db.session.query(Content).filter_by(
            campaign_id=campaign_id, order=order
        ).first()
        if existing_content:
            return ErrorResponse().dump(
                dict(
                    message=f"Content order must be unique within a campaign. Use a different content order apart from '{order}'.", error="Content order already exists"
                )
            ), 400

    try:
        # Create a new Content object
        new_content = Content(
            content_type=content_data['content_type'],
            title=content_data['title'],
            subtitle=content_data.get('subtitle'),
            description=content_data.get('description'),
            button_text=content_data.get('button_text'),
            button_link=content_data.get('button_link'),
            start_date=content_data.get('start_date'),
            end_date=content_data.get('end_date'),
            order=order,
            campaign_id=campaign_id,
            campaign=campaign,
            external_url=content_data.get('external_url')
        )

        # Use db.session directly to add and commit the new record
        db.session.add(new_content)
        db.session.commit()

        # After commit, refresh the object to ensure the latest changes are reflected
        db.session.refresh(new_content)

        # Serialize the content using Marshmallow schema
        s_content = ContentSchema.from_orm(new_content)

        return ContentResponse().dump(
            dict(content=s_content)
        ), 201
    except Exception as e:
        db.session.rollback()
        get_traceback(e)
        logger.error(f"Error creating content: {e}")
        return ErrorResponse().dump(
            dict(message="Error creating content", error=str(e))
            ), 500
    finally:
        # No need to manually close the session, db.session is managed automatically
        pass

@api_v1.route('/content', methods=['GET'])
def get_contents():
    """
    Get all Contents
    ---
    tags:
      - Content
    responses:
      200:
        description: A list of contents
        schema:
          $ref: '#/definitions/ContentListResponse'
      500:
        description: Error getting content
    """
    try:
        # Use db.session to query the content records
        content_list = db.session.query(Content).all()

        # Serialize the list of content
        content_schemas = [ContentSchema.from_orm(content) for content in content_list]

        # Return the response
        return ContentListResponse().dump(dict(contents=content_schemas)), 200
    except Exception as e:
        get_traceback(e)
        logger.error(f"Error getting content: {e}")
        return ErrorResponse().dump(dict(message="Error getting content", error=str(e))), 500

@api_v1.route('/content/<content_id>', methods=['GET'])
def get_content(content_id):
    """
    Get Content
    ---
    tags:
      - Content
    parameters:
      - in: path
        name: content_id
        schema:
          type: integer
        required: true
        description: ID of the content to get
    responses:
      200:
        description: Content retrieved successfully
        schema:
          $ref: '#/definitions/ContentResponse'
      404:
        description: Content not found
        schema:
          $ref: '#/definitions/ErrorResponse'
      500:
        description: Error getting content
    """
    try:
        # Use db.session to query the content record by ID
        content = db.session.query(Content).get(content_id)

        if not content:
            return ErrorResponse().dump(dict(message=f"Content with the ID '{content_id}' not found", error="Content not found")), 404

        # Serialize the content using Marshmallow schema
        content_schema = ContentSchema.from_orm(content)

        # Return the response
        return ContentResponse().dump(dict(content=content_schema)), 200
    except Exception as e:
        get_traceback(e)
        logger.error(f"Error getting content: {e}")
        return ErrorResponse().dump(dict(message="Error getting content", error=str(e))), 500

@api_v1.route('/content/<content_id>', methods=['PUT'])
@use_args(ContentUpdateRequest)
def update_content(payload, content_id):
    """
    Update Content
    ---
    tags:
      - Content
    parameters:
      - in: path
        name: content_id
        schema:
          type: integer
        required: true
        description: ID of the content to update
      - in: body
        name: body
        schema:
          $ref: '#/definitions/ContentUpdateRequest'
        required: true
        description: Content data
    responses:
      200:
        description: Content updated successfully
        schema:
          $ref: '#/definitions/ContentResponse'
      400:
        description: Invalid request body
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: Content not found
        schema:
          $ref: '#/definitions/ErrorResponse'
      500:
        description: Error updating content
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    content_data = payload

    order = content_data.get('order')

    try:
        # Use db.session to query the content record by ID
        content: Content = db.session.query(Content).get(content_id)

        if not content:
            return ErrorResponse().dump(dict(message=f"Content with the ID '{content_id}' not found", error="Content not found")), 404

        # Get the campaign from the content
        campaign: Campaign = content.campaign
        campaign_id = campaign.id

    except Exception as e:
        get_traceback(e)
        logger.error(f"Error getting campaign: {e}")
        return ErrorResponse().dump(dict(message="Error getting campaign", error=str(e))), 500

    # Ensure no two contents under a campaign have the same order
    if order is not None:
        # Find content with same campaign_id and order
        existing_content = db.session.query(Content).filter_by(
            campaign_id=campaign_id, order=order
        ).filter(Content.id != content_id).first()

        if existing_content:
            return ErrorResponse().dump(
                dict(
                    message=f"Content order must be unique within a campaign. Use a different content order apart from '{order}'.", error="Content order already exists"
                )
            ), 400

    try:
        # Update the content object
        _content_type = content_data.get('content_type')
        _title = content_data.get('title')
        _subtitle = content_data.get('subtitle')
        _description = content_data.get('description')
        _button_text = content_data.get('button_text')
        _button_link = content_data.get('button_link')
        _start_date = content_data.get('start_date')
        _end_date = content_data.get('end_date')
        _order = order
        _external_url = content_data.get('external_url')

        if _content_type: content.content_type = _content_type
        if _title: content.title = _title
        if _subtitle: content.subtitle = _subtitle
        if _description: content.description = _description
        if _button_text: content.button_text = _button_text
        if _button_link: content.button_link = _button_link
        if _start_date: content.start_date = _start_date
        if _end_date: content.end_date = _end_date
        if _order is not None: content.order = _order
        if _external_url: content.external_url = _external_url

        # Use db.session directly to add and commit the new record
        db.session.commit()

        # After commit, refresh the object to ensure the latest changes are reflected
        db.session.refresh(content)

        # Serialize the content using Marshmallow schema
        s_content = ContentSchema.from_orm(content)

        return ContentResponse().dump(
            dict(content=s_content)
        ), 200
    except Exception as e:
        db.session.rollback()
        get_traceback(e)
        logger.error(f"Error creating content: {e}")
        return ErrorResponse().dump(
            dict(message="Error updating content", error=str(e))
            ), 500
    finally:
        # No need to manually close the session, db.session is managed automatically
        pass

@api_v1.route('/content/<content_id>', methods=['DELETE'])
def delete_content(content_id):
    """
    Delete Content
    ---
    tags:
      - Content
    parameters:
      - in: path
        name: content_id
        schema:
          type: integer
        required: true
        description: ID of the content to delete
    responses:
      204:
        description: Content deleted successfully
      404:
        description: Content not found
        schema:
          $ref: '#/definitions/ErrorResponse'
      500:
        description: Error deleting content
    """
    try:
        # Use db.session to query the content record by ID
        content = db.session.query(Content).get(content_id)

        if not content:
            return ErrorResponse().dump(dict(message=f"Content with the ID '{content_id}' not found", error="Content not found")), 404

        # Use db.session directly to delete and commit the record
        db.session.delete(content)
        db.session.commit()

        return '', 204
    except Exception as e:
        db.session.rollback()
        get_traceback(e)
        logger.error(f"Error deleting content: {e}")
        return ErrorResponse().dump(dict(message="Error deleting content", error=str(e))), 500

# region Campaign APIs
@api_v1.route('/campaign', methods=['POST'])
@use_args(CampaignCreateRequest)
def create_campaign(payload):
    """
    Create Campaign
    ---
    tags:
      - Campaign
    parameters:
      - in: body
        name: body
        schema:
          $ref: '#/definitions/CampaignCreateRequest'
        required: true
        description: Campaign data
    responses:
      201:
        description: Campaign created successfully
        schema:
          $ref: '#/definitions/CampaignResponse'
      400:
        description: Invalid request body
        schema:
          $ref: '#/definitions/ErrorResponse'
      500:
        description: Error creating campaign
        schema:
          $ref: '#/definitions/ErrorResponse'
    """

    campaign_data = payload

    try:
        existing_campaign = db.session.query(Campaign).filter_by(name=campaign_data['name']).first()
        if existing_campaign:
            return ErrorResponse().dump(dict(message="Campaign name must be unique", error="Campaign name already exists")), 400
        
        if payload.get('active') == True:
            # De-activate existing 'active' campaigns
            db.session.query(Campaign).filter(Campaign.active == True).update({Campaign.active: False})

        # Create a new Campaign object
        new_campaign = Campaign(
            name=campaign_data['name']
        )

        # Use db.session directly to add and commit the new record
        db.session.add(new_campaign)
        db.session.commit()

        # After commit, refresh the object to ensure the latest changes are reflected
        db.session.refresh(new_campaign)

        # Serialize the campaign using Marshmallow schema class method
        s_campaign = CampaignSchema.from_orm(new_campaign)

        return CampaignResponse().dump(
            dict(campaign=s_campaign)
        ), 201
    except Exception as e:
        db.session.rollback()
        get_traceback(e)
        logger.error(f"Error creating campaign: {e}")
        return ErrorResponse().dump(
            dict(message="Error creating campaign", error=str(e))
            ), 500
    finally:
        # No need to manually close the session, db.session is managed automatically
        pass

@api_v1.route('/campaign/<campaign_id>', methods=['GET'])
def get_campaign(campaign_id):
    """
    Get Campaign
    ---
    tags:
      - Campaign
    parameters:
      - in: path
        name: campaign_id
        schema:
          type: integer
        required: true
        description: ID of the campaign to get
    responses:
      200:
        description: Campaign retrieved successfully
        schema:
          $ref: '#/definitions/CampaignResponse'
      404:
        description: Campaign not found
        schema:
          $ref: '#/definitions/ErrorResponse'
      500:
        description: Error getting campaign
    """
    try:
        # Use db.session to query the campaign record by ID
        campaign = db.session.query(Campaign).get(campaign_id)

        if not campaign:
            return ErrorResponse().dump(dict(message=f"Campaign with the ID '{campaign_id}' not found", error="Campaign not found")), 404

        # Serialize the campaign using Marshmallow schema
        campaign_schema = CampaignSchema.from_orm(campaign)

        # Return the response
        return CampaignResponse().dump(dict(campaign=campaign_schema)), 200
    except Exception as e:
        get_traceback(e)
        logger.error(f"Error getting campaign: {e}")
        return ErrorResponse().dump(dict(message="Error getting campaign", error=str(e))), 500

@api_v1.route('/campaign', methods=['GET'])
def get_campaigns():
    """
    Get all Campaigns
    ---
    tags:
      - Campaign
    responses:
      200:
        description: A list of campaigns
        schema:
          $ref: '#/definitions/CampaignListResponse'
      500:
        description: Error getting campaigns
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    try:
        # Use db.session to query the campaign records
        campaign_list = db.session.query(Campaign).all()

        # Serialize the list of campaigns using the class method
        campaign_schemas = [CampaignSchema.from_orm(campaign) for campaign in campaign_list]

        # Return the response
        return CampaignListResponse().dump(dict(campaigns=campaign_schemas)), 200
    except Exception as e:
        get_traceback(e)
        logger.error(f"Error getting campaigns: {e}")
        return ErrorResponse().dump(dict(message="Error getting campaigns", error=str(e))), 500

@api_v1.route('/campaign/<campaign_id>', methods=['PUT'])
@use_args(CampaignUpdateRequest)
def update_campaign(payload, campaign_id):
    """
    Update Campaign
    ---
    tags:
      - Campaign
    parameters:
      - in: path
        name: campaign_id
        schema:
          type: integer
        required: true
        description: ID of the campaign to update
      - in: body
        name: body
        schema:
          $ref: '#/definitions/CampaignUpdateRequest'
        required: true
        description: Campaign data
    responses:
      200:
        description: Campaign updated successfully
        schema:
          $ref: '#/definitions/CampaignResponse'
      400:
        description: Invalid request body
        schema:
          $ref: '#/definitions/ErrorResponse'
      404:
        description: Campaign not found
        schema:
          $ref: '#/definitions/ErrorResponse'
      500:
        description: Error updating campaign
        schema:
          $ref: '#/definitions/ErrorResponse'
    """
    campaign_data = payload

    try:
        # Use db.session to query the campaign record by ID
        campaign = db.session.query(Campaign).get(campaign_id)

        if not campaign:
            return ErrorResponse().dump(dict(message=f"Campaign with the ID '{campaign_id}' not found", error="Campaign not found")), 404

        campaign_name = campaign_data.get('name')
        if campaign_name:
            existing_campaign = db.session.query(Campaign).filter(Campaign.name==campaign_name, Campaign.id != campaign_id ).first()
            if existing_campaign:
                return ErrorResponse().dump(dict(message="Campaign name must be unique", error="Campaign name already exists")), 400

        if payload.get('active') == True:
            # De-activate existing 'active' campaigns
            db.session.query(Campaign).filter(Campaign.active == True, Campaign.id != campaign_id).update({Campaign.active: False})
            campaign.active = campaign_data.get('active')

        # Update the campaign object
        campaign.name = campaign_name

        # Use db.session directly to add and commit the new record
        db.session.commit()

        # After commit, refresh the object to ensure the latest changes are reflected
        db.session.refresh(campaign)

        # Serialize the campaign using Marshmallow schema
        s_campaign = CampaignSchema.from_orm(campaign)

        return CampaignResponse().dump(
            dict(campaign=s_campaign)
        ), 200
    except Exception as e:
        db.session.rollback()
        get_traceback(e)
        logger.error(f"Error updating campaign: {e}")
        return ErrorResponse().dump(
            dict(message="Error updating campaign", error=str(e))
            ), 500
    finally:
        # No need to manually close the session, db.session is managed automatically
        pass

@api_v1.route('/campaign/<campaign_id>', methods=['DELETE'])
def delete_campaign(campaign_id):
    """
    Delete Campaign
    ---
    tags:
      - Campaign
    parameters:
      - in: path
        name: campaign_id
        schema:
          type: integer
        required: true
        description: ID of the campaign to delete
    responses:
      204:
        description: Campaign deleted successfully
      404:
        description: Campaign not found
        schema:
          $ref: '#/definitions/ErrorResponse'
      500:
        description: Error deleting campaign
    """
    try:
        # Use db.session to query the campaign record by ID
        campaign = db.session.query(Campaign).get(campaign_id)

        if not campaign:
            return ErrorResponse().dump(dict(message=f"Campaign with the ID '{campaign_id}' not found", error="Campaign not found")), 404

        # Use db.session directly to delete and commit the record
        db.session.delete(campaign)
        db.session.commit()

        return '', 204
    except Exception as e:
        db.session.rollback()
        get_traceback(e)
        logger.error(f"Error deleting campaign: {e}")
        return ErrorResponse().dump(dict(message="Error deleting campaign", error=str(e))), 500

@api_v1.route('/campaign/<campaign_id>/content', methods=['GET'])
def get_campaign_content(campaign_id):
    """
    Get all Contents associated with a Campaign
    ---
    tags:
      - Content
    parameters:
      - in: path
        name: campaign_id
        schema:
          type: integer
        required: true
        description: ID of the campaign
    responses:
      200:
        description: A list of contents
        schema:
          $ref: '#/definitions/ContentListResponse'
      404:
        description: Campaign not found
        schema:
          $ref: '#/definitions/ErrorResponse'
      500:
        description: Error getting content
    """
    try:
        # Check if the campaign exists
        campaign = db.session.query(Campaign).get(campaign_id)
        if not campaign:
            return ErrorResponse().dump(dict(message=f"Campaign with the ID '{campaign_id}' not found", error="Campaign not found")), 404
        
        # Use db.session to query the content records associated with the campaign, ordered by 'order'
        content_list = db.session.query(Content).filter_by(campaign_id=campaign_id).order_by(Content.order).all()

        # Serialize the list of content
        content_schemas = [ContentSchema.from_orm(content) for content in content_list]

        # Return the response
        return ContentListResponse().dump(dict(contents=content_schemas)), 200
    except Exception as e:
        get_traceback(e)
        logger.error(f"Error getting content for campaign {campaign_id}: {e}")
        return ErrorResponse().dump(dict(message="Error getting content", error=str(e))), 500

@api_v1.route('/campaigns/active', methods=['GET'])
def get_active_campaign():
    """
    Get the Active Campaign
    ---
    tags:
      - Campaign
    responses:
      200:
        description: Active campaign retrieved successfully
        schema:
          $ref: '#/definitions/CampaignResponse'
      404:
        description: Active Campaign not found
        schema:
          $ref: '#/definitions/ErrorResponse'
      500:
        description: Error getting active campaign
    """
    try:
        # Use db.session to query the active campaign record
        campaign = db.session.query(Campaign).filter_by(active=True).first()

        if not campaign:
            return ErrorResponse().dump(dict(message=f"Active Campaign not found", error="Active Campaign not found")), 404

        # Serialize the campaign using Marshmallow schema
        campaign_schema = CampaignSchema.from_orm(campaign)

        # Return the response
        return CampaignResponse().dump(dict(campaign=campaign_schema)), 200
    except Exception as e:
        get_traceback(e)
        logger.error(f"Error getting active campaign: {e}")
        return ErrorResponse().dump(dict(message="Error getting active campaign", error=str(e))), 500

@api_v1.route('/')
def hello():
    return "Welcome to Spock Admin!!"

app.register_blueprint(api_v1)

if __name__ == '__main__':
    app.run(debug=True)